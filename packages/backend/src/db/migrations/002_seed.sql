-- ============================================================
-- PrintOS — Seed inicial
-- Contraseña admin: admin123 (bcrypt hash)
-- ============================================================

-- Usuario administrador
INSERT INTO users (name, email, password, role) VALUES
  ('Administrador', 'admin@printos.com', '$2a$10$2U5Yraql0LV0w2o5AZR/BeKAfLdGL0ZHwkIKjl90/kMotnJJeJ3dK', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Tasa de cambio inicial (ajustar según el día)
INSERT INTO exchange_rates (currency, rate, source) VALUES
  ('USD', 36.50, 'manual'),
  ('EUR', 39.80, 'manual')
ON CONFLICT DO NOTHING;

-- Materiales base
INSERT INTO materials (name, description, unit, price_per_unit, currency) VALUES
  ('Papel Bond 75gr', 'Papel bond estándar A4/carta', 'm2', 0.80, 'USD'),
  ('Papel Fotográfico Brillante', 'Alta resolución, acabado brillante', 'm2', 3.50, 'USD'),
  ('Papel Fotográfico Mate', 'Alta resolución, acabado mate', 'm2', 3.20, 'USD'),
  ('Vinilo Autoadhesivo Blanco', 'Vinilo estándar para interiores', 'm2', 4.50, 'USD'),
  ('Vinilo Autoadhesivo Transparente', 'Para vidrieras y ventanas', 'm2', 5.00, 'USD'),
  ('Lona Banner 440gr', 'Lona para exteriores con refuerzo', 'm2', 6.00, 'USD'),
  ('Lona Mesh (perforada)', 'Para cercas y fachadas con viento', 'm2', 7.50, 'USD'),
  ('PVC Rígido 3mm', 'Planchas PVC para señalética', 'm2', 12.00, 'USD'),
  ('Cartón Corrugado', 'Cartón para exhibidores', 'm2', 5.50, 'USD'),
  ('Papel Adhesivo Kraft', 'Para empaquetado y decoración', 'm2', 2.50, 'USD')
ON CONFLICT DO NOTHING;

-- Procesos / máquinas
INSERT INTO processes (name, description, cost_per_hour, labor_rate, currency) VALUES
  ('Impresión Láser B&N', 'Impresora láser monocromática', 8.00, 3.00, 'USD'),
  ('Impresión Láser Color', 'Impresora láser a color', 15.00, 3.00, 'USD'),
  ('Plotter de Impresión', 'Gran formato hasta 1.6m', 20.00, 5.00, 'USD'),
  ('Plotter de Corte', 'Corte de vinilo por trayectoria', 12.00, 4.00, 'USD'),
  ('Sublimación', 'Transferencia por calor', 18.00, 5.00, 'USD'),
  ('Impresión UV', 'UV sobre superficies rígidas', 30.00, 6.00, 'USD'),
  ('Laminado en Frío', 'Laminadora de presión', 6.00, 2.50, 'USD'),
  ('Encuadernado Anillado', 'Anillado con espiral plástica', 5.00, 2.00, 'USD')
ON CONFLICT DO NOTHING;

-- Acabados
INSERT INTO finishing_options (name, description, cost_per_unit, currency) VALUES
  ('Ojales', 'Ojal metálico por unidad (banners)', 0.30, 'USD'),
  ('Dobladillo Sellado', 'Refuerzo perimetral en lonas', 1.50, 'USD'),
  ('Laminado Brillante', 'Film brillante por m2', 2.00, 'USD'),
  ('Laminado Mate', 'Film mate por m2', 2.20, 'USD'),
  ('Corte Recto', 'Guillotinado recto estándar', 0.50, 'USD'),
  ('Corte Especial', 'Corte en formas personalizadas', 2.00, 'USD'),
  ('Pegado en PVC', 'Adhesivo de impresión sobre PVC', 3.00, 'USD'),
  ('Plastificado', 'Plastificado en bolsa térmica', 0.80, 'USD')
ON CONFLICT DO NOTHING;

-- Estaciones de producción
INSERT INTO stations (name, description, sort_order) VALUES
  ('recepcion',      'Recepción y verificación del trabajo',  1),
  ('diseno',         'Diseño y preparación de artes',         2),
  ('impresion',      'Impresión (láser o plotter)',            3),
  ('acabados',       'Acabados: corte, laminado, ojales',     4),
  ('control_calidad','Revisión final antes de entrega',       5),
  ('retiro',         'Entrega al cliente',                    6)
ON CONFLICT (name) DO NOTHING;
