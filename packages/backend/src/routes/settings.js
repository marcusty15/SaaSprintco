const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

// GET /api/settings — obtener toda la config
router.get('/', verifyToken, async (req, res) => {
  try {
    const [settingsResult, ratesResult] = await Promise.all([
      pool.query('SELECT key, value FROM settings'),
      pool.query('SELECT currency, rate::float FROM exchange_rates WHERE active = true'),
    ]);

    const settings = {};
    settingsResult.rows.forEach(r => { settings[r.key] = r.value; });
    ratesResult.rows.forEach(r => { settings[`rate_${r.currency}`] = r.rate; });

    res.json(settings);
  } catch (err) {
    console.error('[settings/get]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/settings — guardar config general
router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
  const { company_name, margin_percent, iva_percent } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updates = { company_name, margin_percent, iva_percent };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await client.query(
          `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2,NOW())
           ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
          [key, String(value)]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[settings/put]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PUT /api/settings/rates — actualizar tasas de cambio
router.put('/rates', verifyToken, requireRole('admin'), async (req, res) => {
  const { USD, EUR } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [currency, rate] of Object.entries({ USD, EUR })) {
      if (rate !== undefined && rate !== '') {
        await client.query(
          `UPDATE exchange_rates SET rate=$1 WHERE currency=$2 AND active=true`,
          [parseFloat(rate), currency]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[settings/rates]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
