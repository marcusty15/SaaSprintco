const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

router.get('/materials', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, unit, price_per_unit, currency FROM materials WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('[catalog/materials]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/processes', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, cost_per_hour, labor_rate, currency FROM processes WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('[catalog/processes]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/finishings', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, cost_per_unit, currency FROM finishing_options WHERE active = true ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('[catalog/finishings]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
