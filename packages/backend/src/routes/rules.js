const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');
const { verifyToken }  = require('../middleware/auth');
const { requireRole }  = require('../middleware/requireRole');

const admin = [verifyToken, requireRole('admin')];

// ─── GET /api/rules ───────────────────────────────────────────────────────────
// Query params: ?material_id=X  (opcional, usado por Station)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { material_id } = req.query;
    const conditions = ['r.active = true'];
    const params     = [];

    if (material_id) {
      params.push(parseInt(material_id, 10));
      conditions.push(`r.material_id = $${params.length}`);
    }

    const { rows } = await pool.query(`
      SELECT
        r.*,
        m.name AS material_name,
        m.unit AS material_unit,
        p.name AS process_name
      FROM production_rules r
      JOIN  materials m ON m.id = r.material_id
      LEFT JOIN processes p ON p.id = r.process_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.name, p.name NULLS FIRST
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('[rules/get]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── POST /api/rules ──────────────────────────────────────────────────────────
router.post('/', ...admin, async (req, res) => {
  const {
    material_id, process_id,
    min_dpi, bleed_mm, safe_zone_mm, color_mode, accepted_formats,
    print_speed, print_passes, icc_profile,
    cut_speed, cut_pressure, cut_passes, blade_offset_mm,
    notes,
  } = req.body;

  if (!material_id) return res.status(400).json({ error: 'material_id es requerido' });

  try {
    const { rows } = await pool.query(`
      INSERT INTO production_rules (
        material_id, process_id,
        min_dpi, bleed_mm, safe_zone_mm, color_mode, accepted_formats,
        print_speed, print_passes, icc_profile,
        cut_speed, cut_pressure, cut_passes, blade_offset_mm,
        notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      parseInt(material_id, 10),
      process_id  ? parseInt(process_id, 10)    : null,
      min_dpi     ? parseInt(min_dpi, 10)        : null,
      bleed_mm    ? parseFloat(bleed_mm)         : null,
      safe_zone_mm? parseFloat(safe_zone_mm)     : null,
      color_mode  || null,
      accepted_formats || [],
      print_speed ? parseFloat(print_speed)      : null,
      print_passes? parseInt(print_passes, 10)   : null,
      icc_profile || null,
      cut_speed   ? parseFloat(cut_speed)        : null,
      cut_pressure? parseFloat(cut_pressure)     : null,
      cut_passes  ? parseInt(cut_passes, 10)     : null,
      blade_offset_mm ? parseFloat(blade_offset_mm) : null,
      notes       || null,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una regla para esa combinación material/proceso' });
    console.error('[rules/post]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── PUT /api/rules/:id ───────────────────────────────────────────────────────
router.put('/:id', ...admin, async (req, res) => {
  const {
    material_id, process_id,
    min_dpi, bleed_mm, safe_zone_mm, color_mode, accepted_formats,
    print_speed, print_passes, icc_profile,
    cut_speed, cut_pressure, cut_passes, blade_offset_mm,
    notes,
  } = req.body;

  if (!material_id) return res.status(400).json({ error: 'material_id es requerido' });

  try {
    const { rows } = await pool.query(`
      UPDATE production_rules SET
        material_id      = $1,  process_id       = $2,
        min_dpi          = $3,  bleed_mm         = $4,
        safe_zone_mm     = $5,  color_mode       = $6,
        accepted_formats = $7,  print_speed      = $8,
        print_passes     = $9,  icc_profile      = $10,
        cut_speed        = $11, cut_pressure     = $12,
        cut_passes       = $13, blade_offset_mm  = $14,
        notes            = $15, updated_at       = NOW()
      WHERE id = $16 AND active = true
      RETURNING *
    `, [
      parseInt(material_id, 10),
      process_id  ? parseInt(process_id, 10)    : null,
      min_dpi     ? parseInt(min_dpi, 10)        : null,
      bleed_mm    ? parseFloat(bleed_mm)         : null,
      safe_zone_mm? parseFloat(safe_zone_mm)     : null,
      color_mode  || null,
      accepted_formats || [],
      print_speed ? parseFloat(print_speed)      : null,
      print_passes? parseInt(print_passes, 10)   : null,
      icc_profile || null,
      cut_speed   ? parseFloat(cut_speed)        : null,
      cut_pressure? parseFloat(cut_pressure)     : null,
      cut_passes  ? parseInt(cut_passes, 10)     : null,
      blade_offset_mm ? parseFloat(blade_offset_mm) : null,
      notes       || null,
      req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una regla para esa combinación material/proceso' });
    console.error('[rules/put]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── DELETE /api/rules/:id ────────────────────────────────────────────────────
router.delete('/:id', ...admin, async (req, res) => {
  try {
    await pool.query('UPDATE production_rules SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[rules/delete]', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
