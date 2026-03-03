#!/usr/bin/env node
/**
 * PrintOS — Migration runner
 * Ejecuta todos los archivos .sql de migrations/ en orden numérico.
 * Uso: node src/db/migrate.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`[migrate] Running ${file}...`);
      await client.query(sql);
      console.log(`[migrate] ✓ ${file}`);
    }
    console.log('[migrate] All migrations completed successfully.');
  } catch (err) {
    console.error('[migrate] ERROR:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
