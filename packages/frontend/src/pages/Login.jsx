import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { LIGHT, font } from '../lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const T = LIGHT;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {}
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${T.border}`, background: T.surface2,
    fontSize: 13, color: T.text, outline: 'none',
    boxSizing: 'border-box', fontFamily: font,
  };
  const lbl = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: font }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 16px' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: T.text, letterSpacing: '-1px' }}>
            Print<span style={{ color: T.accent }}>OS</span>
          </div>
          <div style={{ fontSize: 13, color: T.textMid, marginTop: 6 }}>Sistema de gestión para imprentas</div>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 32, boxShadow: T.shadowMd }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 24 }}>Iniciar sesión</div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}55`, fontSize: 13, color: T.danger }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Correo electrónico</label>
              <input
                type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                style={inp} placeholder="usuario@empresa.com"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Contraseña</label>
              <input
                type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                style={inp} placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: loading ? T.accent + '99' : T.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: font }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: T.textLight, marginTop: 20 }}>
          PrintOS v1.0 — Sistema interno
        </div>
      </div>
    </div>
  );
}
