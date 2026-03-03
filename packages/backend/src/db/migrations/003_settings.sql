-- ============================================================
-- PrintOS — Configuración general del sistema
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('company_name',    'Color Express'),
  ('margin_percent',  '35'),
  ('iva_percent',     '16')
ON CONFLICT (key) DO NOTHING;
