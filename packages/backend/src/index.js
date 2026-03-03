require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const quotesRoutes = require('./routes/quotes');
const clientsRoutes = require('./routes/clients');
const catalogRoutes = require('./routes/catalog');
const ordersRoutes   = require('./routes/orders');
const settingsRoutes   = require('./routes/settings');
const dashboardRoutes  = require('./routes/dashboard');
const usersRoutes      = require('./routes/users');
const rulesRoutes      = require('./routes/rules');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.printos.com']
    : (origin, cb) => cb(null, true), // dev: allow all localhost origins
  credentials: true,
}));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders',   ordersRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users',    usersRoutes);
app.use('/api/rules',    rulesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrintOS', version: '1.0.0' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`PrintOS backend corriendo en http://localhost:${PORT}`);
});
