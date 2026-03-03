const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      cobradoHoy,
      enProceso,
      listosEntregar,
      pendientesCobro,
      presupuestosRecientes,
      ordenesRecientes,
    ] = await Promise.all([

      // Cobrado hoy (órdenes pagadas hoy)
      pool.query(`
        SELECT COALESCE(SUM(total_ves), 0)::float AS total
        FROM work_orders
        WHERE paid = true AND DATE(paid_at AT TIME ZONE 'UTC') = $1
      `, [today]),

      // Órdenes en producción
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM work_orders
        WHERE status IN ('pending', 'in_progress')
      `),

      // Listos para entregar
      pool.query(`
        SELECT
          COUNT(*)::int AS count,
          (SELECT wo2.code || ' · ' || COALESCE(c2.name, 'Sin cliente')
           FROM work_orders wo2
           LEFT JOIN clients c2 ON c2.id = wo2.client_id
           WHERE wo2.status = 'completed'
           ORDER BY wo2.updated_at DESC LIMIT 1) AS info
        FROM work_orders
        WHERE status = 'completed'
      `),

      // Pendientes de cobro (presupuestos aprobados, agrupado por moneda)
      pool.query(`
        SELECT currency, COALESCE(SUM(subtotal), 0)::float AS total
        FROM quotes
        WHERE status = 'approved'
        GROUP BY currency
      `),

      // Presupuestos recientes (últimos 5)
      pool.query(`
        SELECT q.id, q.code, q.status, q.subtotal::float, q.currency,
               q.created_at, c.name AS client_name
        FROM quotes q
        LEFT JOIN clients c ON c.id = q.client_id
        ORDER BY q.created_at DESC
        LIMIT 5
      `),

      // Órdenes en producción recientes (últimas 4)
      pool.query(`
        SELECT
          wo.id, wo.code, wo.status,
          c.name AS client_name,
          COUNT(wos.id)::int                                    AS total_stations,
          COUNT(wos.id) FILTER (WHERE wos.status='done')::int  AS done_stations,
          (SELECT s.name FROM work_order_stations ws
           JOIN stations s ON s.id = ws.station_id
           WHERE ws.work_order_id = wo.id AND ws.status = 'in_progress'
           ORDER BY ws.sort_order LIMIT 1) AS current_station
        FROM work_orders wo
        LEFT JOIN clients c ON c.id = wo.client_id
        LEFT JOIN work_order_stations wos ON wos.work_order_id = wo.id
        WHERE wo.status IN ('pending','in_progress','completed')
        GROUP BY wo.id, c.name
        ORDER BY wo.created_at DESC
        LIMIT 4
      `),
    ]);

    // Pendientes de cobro: sumar todos en un solo número (usando EUR o USD)
    const pendienteTotal = pendientesCobro.rows.reduce((sum, r) => sum + r.total, 0);
    const pendienteCurrency = pendientesCobro.rows[0]?.currency || 'USD';

    res.json({
      cobrado_hoy:       cobradoHoy.rows[0].total,
      en_proceso:        enProceso.rows[0].count,
      listos_entregar:   listosEntregar.rows[0].count,
      listos_info:       listosEntregar.rows[0].info || '',
      pendientes_cobro:  pendienteTotal,
      pendientes_currency: pendienteCurrency,
      presupuestos_recientes: presupuestosRecientes.rows,
      ordenes_recientes:      ordenesRecientes.rows,
    });
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
