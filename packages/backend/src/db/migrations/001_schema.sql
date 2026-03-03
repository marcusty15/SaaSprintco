-- ============================================================
-- PrintOS — Schema inicial
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USUARIOS Y ROLES
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'atencion', 'cajera', 'operario', 'disenador');

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        user_role NOT NULL DEFAULT 'atencion',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(30),
  rif         VARCHAR(20),
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASAS DE CAMBIO
-- ============================================================
CREATE TYPE currency_code AS ENUM ('USD', 'EUR');

CREATE TABLE IF NOT EXISTS exchange_rates (
  id          SERIAL PRIMARY KEY,
  currency    currency_code NOT NULL,
  rate        NUMERIC(12, 4) NOT NULL,          -- 1 USD/EUR = X VES
  source      VARCHAR(100) DEFAULT 'manual',    -- 'bcv', 'paralelo', 'manual'
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solo una tasa activa por moneda
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_active_currency
  ON exchange_rates (currency) WHERE active = true;

-- ============================================================
-- MATERIALES
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  unit            VARCHAR(20) NOT NULL DEFAULT 'm2',  -- m2, unidad, metro_lineal
  price_per_unit  NUMERIC(10, 4) NOT NULL,
  currency        currency_code NOT NULL DEFAULT 'USD',
  stock_enabled   BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROCESOS (máquinas / servicios)
-- ============================================================
CREATE TABLE IF NOT EXISTS processes (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  cost_per_hour   NUMERIC(10, 4) NOT NULL,
  labor_rate      NUMERIC(10, 4) NOT NULL DEFAULT 0,  -- costo mano de obra por hora
  currency        currency_code NOT NULL DEFAULT 'USD',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OPCIONES DE ACABADO
-- ============================================================
CREATE TABLE IF NOT EXISTS finishing_options (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  cost_per_unit   NUMERIC(10, 4) NOT NULL,
  currency        currency_code NOT NULL DEFAULT 'USD',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COTIZACIONES
-- ============================================================
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');

CREATE TABLE IF NOT EXISTS quotes (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(20) NOT NULL UNIQUE,        -- QUO-2024-0001
  client_id       INTEGER REFERENCES clients(id),
  created_by      INTEGER NOT NULL REFERENCES users(id),
  currency        currency_code NOT NULL DEFAULT 'USD',
  exchange_rate   NUMERIC(12, 4),                    -- tasa al momento de cotizar
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_ves       NUMERIC(14, 2),
  notes           TEXT,
  status          quote_status NOT NULL DEFAULT 'draft',
  valid_until     DATE,
  approved_at     TIMESTAMPTZ,
  approved_by     INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍTEMS DE COTIZACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_items (
  id              SERIAL PRIMARY KEY,
  quote_id        INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  material_id     INTEGER NOT NULL REFERENCES materials(id),
  process_id      INTEGER NOT NULL REFERENCES processes(id),
  description     TEXT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  width_cm        NUMERIC(8, 2),
  height_cm       NUMERIC(8, 2),
  area_m2         NUMERIC(10, 4),
  machine_hours   NUMERIC(8, 4) NOT NULL DEFAULT 0,
  material_cost   NUMERIC(10, 4) NOT NULL DEFAULT 0,
  process_cost    NUMERIC(10, 4) NOT NULL DEFAULT 0,
  finishing_cost  NUMERIC(10, 4) NOT NULL DEFAULT 0,
  labor_cost      NUMERIC(10, 4) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Acabados aplicados a un ítem de cotización
CREATE TABLE IF NOT EXISTS quote_item_finishings (
  quote_item_id   INTEGER NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
  finishing_id    INTEGER NOT NULL REFERENCES finishing_options(id),
  PRIMARY KEY (quote_item_id, finishing_id)
);

-- ============================================================
-- ÓRDENES DE TRABAJO
-- ============================================================
CREATE TYPE order_status AS ENUM ('pending', 'in_progress', 'completed', 'delivered', 'cancelled');

CREATE TABLE IF NOT EXISTS work_orders (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(20) NOT NULL UNIQUE,        -- ORD-2024-0001
  quote_id        INTEGER REFERENCES quotes(id),
  client_id       INTEGER REFERENCES clients(id),
  created_by      INTEGER NOT NULL REFERENCES users(id),
  status          order_status NOT NULL DEFAULT 'pending',
  priority        SMALLINT NOT NULL DEFAULT 1,        -- 1=normal, 2=urgente, 3=express
  due_date        DATE,
  notes           TEXT,
  paid            BOOLEAN NOT NULL DEFAULT false,
  paid_at         TIMESTAMPTZ,
  paid_by         INTEGER REFERENCES users(id),       -- cajera que registró el pago
  payment_method  VARCHAR(50),
  total_ves       NUMERIC(14, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ESTACIONES DE PRODUCCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS stations (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);

-- Paso de una orden por cada estación
CREATE TYPE station_status AS ENUM ('pending', 'in_progress', 'done', 'skipped');

CREATE TABLE IF NOT EXISTS work_order_stations (
  id              SERIAL PRIMARY KEY,
  work_order_id   INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  station_id      INTEGER NOT NULL REFERENCES stations(id),
  status          station_status NOT NULL DEFAULT 'pending',
  assigned_to     INTEGER REFERENCES users(id),
  notes           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (work_order_id, station_id)
);

-- ============================================================
-- ÍNDICES ÚTILES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_client ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_order_stations_order ON work_order_stations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
