const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const admin = [verifyToken, requireRole('admin')];

// ─── MATERIALES ────────────────────────────────────────────────────────────

router.get('/materials', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM materials WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.post('/materials', ...admin, async (req, res) => {
  const { name, description, unit, price_per_unit, currency } = req.body;
  if (!name || !unit || !price_per_unit) return res.status(400).json({ error: 'Nombre, unidad y precio son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO materials (name, description, unit, price_per_unit, currency)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description || null, unit, parseFloat(price_per_unit), currency || 'USD']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.put('/materials/:id', ...admin, async (req, res) => {
  const { name, description, unit, price_per_unit, currency } = req.body;
  if (!name || !unit || !price_per_unit) return res.status(400).json({ error: 'Nombre, unidad y precio son requeridos' });
  try {
    const { rows } = await pool.query(
      `UPDATE materials SET name=$1, description=$2, unit=$3, price_per_unit=$4, currency=$5, updated_at=NOW()
       WHERE id=$6 AND active=true RETURNING *`,
      [name, description || null, unit, parseFloat(price_per_unit), currency || 'USD', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.delete('/materials/:id', ...admin, async (req, res) => {
  try {
    await pool.query('UPDATE materials SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── PROCESOS ──────────────────────────────────────────────────────────────

router.get('/processes', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM processes WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.post('/processes', ...admin, async (req, res) => {
  const { name, description, cost_per_hour, labor_rate, currency } = req.body;
  if (!name || !cost_per_hour) return res.status(400).json({ error: 'Nombre y costo/hora son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO processes (name, description, cost_per_hour, labor_rate, currency)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description || null, parseFloat(cost_per_hour), parseFloat(labor_rate || 0), currency || 'USD']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.put('/processes/:id', ...admin, async (req, res) => {
  const { name, description, cost_per_hour, labor_rate, currency } = req.body;
  if (!name || !cost_per_hour) return res.status(400).json({ error: 'Nombre y costo/hora son requeridos' });
  try {
    const { rows } = await pool.query(
      `UPDATE processes SET name=$1, description=$2, cost_per_hour=$3, labor_rate=$4, currency=$5, updated_at=NOW()
       WHERE id=$6 AND active=true RETURNING *`,
      [name, description || null, parseFloat(cost_per_hour), parseFloat(labor_rate || 0), currency || 'USD', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.delete('/processes/:id', ...admin, async (req, res) => {
  try {
    await pool.query('UPDATE processes SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ─── ACABADOS ──────────────────────────────────────────────────────────────

router.get('/finishings', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM finishing_options WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.post('/finishings', ...admin, async (req, res) => {
  const { name, description, cost_per_unit, currency } = req.body;
  if (!name || !cost_per_unit) return res.status(400).json({ error: 'Nombre y costo son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO finishing_options (name, description, cost_per_unit, currency)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, description || null, parseFloat(cost_per_unit), currency || 'USD']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.put('/finishings/:id', ...admin, async (req, res) => {
  const { name, description, cost_per_unit, currency } = req.body;
  if (!name || !cost_per_unit) return res.status(400).json({ error: 'Nombre y costo son requeridos' });
  try {
    const { rows } = await pool.query(
      `UPDATE finishing_options SET name=$1, description=$2, cost_per_unit=$3, currency=$4
       WHERE id=$5 AND active=true RETURNING *`,
      [name, description || null, parseFloat(cost_per_unit), currency || 'USD', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

router.delete('/finishings/:id', ...admin, async (req, res) => {
  try {
    await pool.query('UPDATE finishing_options SET active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

module.exports = router;
