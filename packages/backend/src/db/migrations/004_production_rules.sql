-- ============================================================
-- PrintOS — Reglas de producción (specs de archivo + parámetros de máquina)
-- ============================================================

CREATE TABLE IF NOT EXISTS production_rules (
  id                  SERIAL PRIMARY KEY,

  -- Asociación
  material_id         INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  process_id          INTEGER          REFERENCES processes(id) ON DELETE SET NULL,

  -- Especificaciones de archivo
  min_dpi             SMALLINT,
  bleed_mm            NUMERIC(6,2),
  safe_zone_mm        NUMERIC(6,2),
  color_mode          VARCHAR(20),
  accepted_formats    TEXT[]  DEFAULT '{}',

  -- Parámetros de impresión
  print_speed         NUMERIC(8,2),
  print_passes        SMALLINT,
  icc_profile         VARCHAR(100),

  -- Parámetros de corte
  cut_speed           NUMERIC(8,2),
  cut_pressure        NUMERIC(8,2),
  cut_passes          SMALLINT,
  blade_offset_mm     NUMERIC(6,3),

  -- Notas internas
  notes               TEXT,

  active              BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_rule_material_process UNIQUE (material_id, process_id)
);

CREATE INDEX IF NOT EXISTS idx_production_rules_material
  ON production_rules (material_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_production_rules_process
  ON production_rules (process_id) WHERE active = true AND process_id IS NOT NULL;
