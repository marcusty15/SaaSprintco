const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// GET /api/orders — lista con cliente, progreso de estaciones
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wo.*,
        c.name AS client_name,
        u.name AS created_by_name,
        -- progreso de estaciones
        COUNT(wos.id)::int                                    AS total_stations,
        COUNT(wos.id) FILTER (WHERE wos.status = 'done')::int AS done_stations,
        -- estación actual (primera in_progress, o la última done)
        (SELECT s.name FROM work_order_stations ws
           JOIN stations s ON s.id = ws.station_id
           WHERE ws.work_order_id = wo.id AND ws.status = 'in_progress'
           ORDER BY ws.sort_order LIMIT 1)                    AS current_station,
        (SELECT u2.name FROM work_order_stations ws
           JOIN users u2 ON u2.id = ws.assigned_to
           WHERE ws.work_order_id = wo.id AND ws.status = 'in_progress'
           ORDER BY ws.sort_order LIMIT 1)                    AS current_operator
      FROM work_orders wo
      LEFT JOIN clients c  ON c.id  = wo.client_id
      LEFT JOIN users u    ON u.id  = wo.created_by
      LEFT JOIN work_order_stations wos ON wos.work_order_id = wo.id
      WHERE wo.status <> 'cancelled'
      GROUP BY wo.id, c.name, u.name
      ORDER BY wo.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[orders/list]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/orders/:id — detalle con estaciones
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT wo.*, c.name AS client_name
      FROM work_orders wo
      LEFT JOIN clients c ON c.id = wo.client_id
      WHERE wo.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Orden no encontrada' });

    const { rows: stations } = await pool.query(`
      SELECT wos.*, s.name AS station_name, s.sort_order, u.name AS operator_name
      FROM work_order_stations wos
      JOIN stations s ON s.id = wos.station_id
      LEFT JOIN users u ON u.id = wos.assigned_to
      WHERE wos.work_order_id = $1
      ORDER BY wos.sort_order
    `, [req.params.id]);

    res.json({ ...rows[0], stations });
  } catch (err) {
    console.error('[orders/get]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/orders — crear orden (manual o desde quote)
router.post('/', verifyToken, requireRole('admin', 'atencion'), async (req, res) => {
  const { client_id, quote_id, notes, due_date, priority = 1, total_ves } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generar código
    const countResult = await client.query('SELECT COUNT(*)::int AS n FROM work_orders');
    const code = `ORD-${new Date().getFullYear()}-${String(countResult.rows[0].n + 1).padStart(4, '0')}`;

    // Crear la orden
    const orderResult = await client.query(
      `INSERT INTO work_orders (code, client_id, quote_id, created_by, priority, notes, due_date, total_ves, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [code, client_id || null, quote_id || null, req.user.id, priority, notes || null, due_date || null, total_ves || null]
    );
    const order = orderResult.rows[0];

    // Crear las 6 estaciones automáticamente
    const { rows: stations } = await client.query('SELECT id, sort_order FROM stations WHERE active = true ORDER BY sort_order');
    for (const s of stations) {
      await client.query(
        `INSERT INTO work_order_stations (work_order_id, station_id, status, sort_order)
         VALUES ($1,$2,'pending',$3)`,
        [order.id, s.id, s.sort_order]
      );
    }

    // Marcar primera estación como in_progress
    if (stations.length > 0) {
      await client.query(
        `UPDATE work_order_stations SET status='in_progress', started_at=NOW()
         WHERE work_order_id=$1 AND station_id=$2`,
        [order.id, stations[0].id]
      );
      await client.query(
        `UPDATE work_orders SET status='in_progress' WHERE id=$1`,
        [order.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/create]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/advance — avanzar a la siguiente estación
router.patch('/:id/advance', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Completar estación actual
    const { rows: current } = await client.query(
      `UPDATE work_order_stations SET status='done', completed_at=NOW()
       WHERE work_order_id=$1 AND status='in_progress'
       RETURNING station_id, sort_order`,
      [req.params.id]
    );

    if (!current[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay estación en progreso' });
    }

    // Buscar la siguiente estación pendiente
    const { rows: next } = await client.query(
      `UPDATE work_order_stations SET status='in_progress', started_at=NOW()
       WHERE work_order_id=$1 AND status='pending'
         AND sort_order > $2
       RETURNING station_id`,
      [req.params.id, current[0].sort_order]
    );

    let newStatus = 'in_progress';
    if (next.length === 0) {
      // Sin más estaciones → completada
      newStatus = 'completed';
    }

    const { rows } = await client.query(
      `UPDATE work_orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [newStatus, req.params.id]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/advance]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/pay — registrar cobro
router.patch('/:id/pay', verifyToken, requireRole('admin', 'cajera', 'atencion'), async (req, res) => {
  const { payment_method, total_ves } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE work_orders
       SET paid=true, paid_at=NOW(), paid_by=$1, payment_method=$2,
           total_ves=COALESCE($3, total_ves), updated_at=NOW()
       WHERE id=$4 AND paid=false RETURNING *`,
      [req.user.id, payment_method || 'Efectivo', total_ves || null, req.params.id]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Orden no encontrada o ya cobrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[orders/pay]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/orders/:id/deliver — marcar como entregada
router.patch('/:id/deliver', verifyToken, requireRole('admin', 'atencion', 'cajera'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE work_orders SET status='delivered', updated_at=NOW() WHERE id=$1 AND status='completed' RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(400).json({ error: 'La orden debe estar completada para entregar' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[orders/deliver]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
