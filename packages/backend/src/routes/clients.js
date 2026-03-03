const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// GET /api/clients
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.*,
        COUNT(DISTINCT q.id)::int  AS quote_count,
        COUNT(DISTINCT wo.id)::int AS order_count
      FROM clients c
      LEFT JOIN quotes q       ON q.client_id  = c.id
      LEFT JOIN work_orders wo ON wo.client_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[clients/list]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clients/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[clients/get]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clients
router.post('/', verifyToken, requireRole('admin', 'atencion'), async (req, res) => {
  const { name, email, phone, rif, address, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (name, email, phone, rif, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name.trim(), email||null, phone||null, rif||null, address||null, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[clients/create]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/clients/:id
router.put('/:id', verifyToken, requireRole('admin', 'atencion'), async (req, res) => {
  const { name, email, phone, rif, address, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `UPDATE clients
       SET name=$1, email=$2, phone=$3, rif=$4, address=$5, notes=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name.trim(), email||null, phone||null, rif||null, address||null, notes||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[clients/update]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('[clients/delete]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
