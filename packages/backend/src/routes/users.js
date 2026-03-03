const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const VALID_ROLES = ['admin', 'atencion', 'cajera', 'operario', 'disenador'];

// GET /api/users
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/users
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Nombre, correo, contraseña y rol son requeridos' });
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Rol inválido' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role, active, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashed, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El correo ya está registrado' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/users/:id
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const { name, email, role, password } = req.body;
  if (!name || !email || !role)
    return res.status(400).json({ error: 'Nombre, correo y rol son requeridos' });
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Rol inválido' });
  try {
    let query, params;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query  = `UPDATE users SET name=$1, email=$2, role=$3, password=$4, updated_at=NOW() WHERE id=$5 RETURNING id, name, email, role, active`;
      params = [name.trim(), email.toLowerCase().trim(), role, hashed, req.params.id];
    } else {
      query  = `UPDATE users SET name=$1, email=$2, role=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, email, role, active`;
      params = [name.trim(), email.toLowerCase().trim(), role, req.params.id];
    }
    const { rows } = await pool.query(query, params);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El correo ya está registrado' });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/users/:id/toggle — activar / desactivar
router.patch('/:id/toggle', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET active = NOT active, updated_at=NOW() WHERE id=$1 RETURNING id, name, active`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
