/**
 * requireRole('admin', 'atencion')
 * Debe usarse DESPUÉS de verifyToken.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permiso denegado para este rol' });
    }
    next();
  };
}

module.exports = { requireRole };
