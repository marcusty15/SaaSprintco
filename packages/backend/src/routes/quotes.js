const express = require('express');
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { calculateQuote } = require('../services/quoteEngine');

const router = express.Router();

// GET /api/quotes — lista
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT q.*, c.name AS client_name, u.name AS created_by_name
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      LEFT JOIN users u   ON u.id = q.created_by
      ORDER BY q.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[quotes/list]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/quotes/:id — detalle con ítems
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT q.*, c.name AS client_name
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cotización no encontrada' });

    const { rows: items } = await pool.query(`
      SELECT qi.*, m.name AS material_name, p.name AS process_name
      FROM quote_items qi
      JOIN materials m ON m.id = qi.material_id
      JOIN processes p ON p.id = qi.process_id
      WHERE qi.quote_id = $1
      ORDER BY qi.sort_order
    `, [req.params.id]);

    res.json({ ...rows[0], items });
  } catch (err) {
    console.error('[quotes/get]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/quotes/calculate — preview sin guardar
router.post('/calculate', verifyToken, requireRole('admin', 'atencion'), async (req, res) => {
  const { currency = 'USD', items } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Se requiere al menos un ítem' });

  if (!['USD', 'EUR'].includes(currency))
    return res.status(400).json({ error: 'Moneda inválida. Use USD o EUR' });

  try {
    const rateResult = await pool.query(
      'SELECT rate FROM exchange_rates WHERE currency = $1 AND active = true LIMIT 1',
      [currency]
    );
    if (!rateResult.rows[0])
      return res.status(422).json({ error: `No hay tasa de cambio activa para ${currency}` });

    const exchangeRate = rateResult.rows[0].rate;

    const resolvedItems = await Promise.all(items.map(async (item) => {
      const { material_id, process_id, quantity, width_cm, height_cm, machine_hours, finishing_ids = [] } = item;

      const [matRow, procRow] = await Promise.all([
        pool.query('SELECT id, name, unit, price_per_unit FROM materials WHERE id = $1 AND active = true', [material_id]),
        pool.query('SELECT id, name, cost_per_hour, labor_rate FROM processes WHERE id = $1 AND active = true', [process_id]),
      ]);

      if (!matRow.rows[0])  throw { status: 422, message: `Material ${material_id} no encontrado` };
      if (!procRow.rows[0]) throw { status: 422, message: `Proceso ${process_id} no encontrado` };

      let finishings = [];
      if (finishing_ids.length > 0) {
        const finResult = await pool.query(
          'SELECT id, name, cost_per_unit FROM finishing_options WHERE id = ANY($1) AND active = true',
          [finishing_ids]
        );
        finishings = finResult.rows;
      }

      return {
        material: matRow.rows[0], process: procRow.rows[0], finishings,
        quantity: parseInt(quantity), width_cm, height_cm, machine_hours,
      };
    }));

    res.json(calculateQuote(resolvedItems, exchangeRate, currency));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[quotes/calculate]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/quotes — guardar cotización
router.post('/', verifyToken, requireRole('admin', 'atencion'), async (req, res) => {
  const { client_id, currency = 'USD', notes, status = 'draft', items } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Se requiere al menos un ítem' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rateResult = await client.query(
      'SELECT rate FROM exchange_rates WHERE currency = $1 AND active = true LIMIT 1',
      [currency]
    );
    if (!rateResult.rows[0]) throw { status: 422, message: `No hay tasa activa para ${currency}` };
    const exchangeRate = rateResult.rows[0].rate;

    const countResult = await client.query('SELECT COUNT(*)::int AS n FROM quotes');
    const code = `QUO-${new Date().getFullYear()}-${String(countResult.rows[0].n + 1).padStart(4, '0')}`;

    const resolvedItems = await Promise.all(items.map(async (item) => {
      const { material_id, process_id, quantity, width_cm, height_cm, machine_hours, finishing_ids = [] } = item;
      const [matRow, procRow] = await Promise.all([
        client.query('SELECT id, name, unit, price_per_unit FROM materials WHERE id = $1', [material_id]),
        client.query('SELECT id, name, cost_per_hour, labor_rate FROM processes WHERE id = $1', [process_id]),
      ]);
      let finishings = [];
      if (finishing_ids.length > 0) {
        const f = await client.query('SELECT id, name, cost_per_unit FROM finishing_options WHERE id = ANY($1)', [finishing_ids]);
        finishings = f.rows;
      }
      return { material: matRow.rows[0], process: procRow.rows[0], finishings, quantity: parseInt(quantity), width_cm, height_cm, machine_hours };
    }));

    const calc = calculateQuote(resolvedItems, exchangeRate, currency);

    const quoteResult = await client.query(
      `INSERT INTO quotes (code, client_id, created_by, currency, exchange_rate, subtotal, total_ves, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [code, client_id || null, req.user.id, currency, exchangeRate, calc.subtotal, calc.total_ves, notes || null, status]
    );
    const quote = quoteResult.rows[0];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const c = calc.items[i];
      const itemResult = await client.query(
        `INSERT INTO quote_items
           (quote_id, material_id, process_id, quantity, width_cm, height_cm, area_m2,
            machine_hours, material_cost, process_cost, labor_cost, finishing_cost, subtotal, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [quote.id, item.material_id, item.process_id, item.quantity,
         item.width_cm || null, item.height_cm || null, c.area_m2,
         item.machine_hours, c.material_cost, c.process_cost, c.labor_cost, c.finishing_cost, c.subtotal, i]
      );
      if (item.finishing_ids?.length > 0) {
        for (const fid of item.finishing_ids) {
          await client.query(
            'INSERT INTO quote_item_finishings (quote_item_id, finishing_id) VALUES ($1,$2)',
            [itemResult.rows[0].id, fid]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(quote);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[quotes/create]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PATCH /api/quotes/:id/status
router.patch('/:id/status', verifyToken, requireRole('admin', 'atencion'), async (req, res) => {
  const { status } = req.body;
  const valid = ['draft', 'sent', 'approved', 'rejected', 'expired'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    let query, params;
    if (status === 'approved') {
      query = `UPDATE quotes SET status=$1, approved_at=NOW(), approved_by=$2, updated_at=NOW() WHERE id=$3 RETURNING *`;
      params = [status, req.user.id, req.params.id];
    } else {
      query = `UPDATE quotes SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`;
      params = [status, req.params.id];
    }
    const { rows } = await pool.query(query, params);
    if (!rows[0]) return res.status(404).json({ error: 'Cotización no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[quotes/status]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
