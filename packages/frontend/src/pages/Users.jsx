import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { LIGHT, DARK, font, avatarColors } from '../lib/theme';
import { api } from '../lib/api';

const ROLES = [
  { value: 'admin',     label: 'Administrador' },
  { value: 'atencion',  label: 'Atención' },
  { value: 'cajera',    label: 'Cajera' },
  { value: 'operario',  label: 'Operario' },
  { value: 'disenador', label: 'Diseñador' },
];

const ROLE_COLORS = (T) => ({
  admin:     { bg: '#e8e0f8', color: '#6b4fc4' },
  atencion:  { bg: T.blueLight,   color: T.blue },
  cajera:    { bg: T.accentLight, color: T.accentDark },
  operario:  { bg: T.yellowLight, color: T.yellow },
  disenador: { bg: T.peachLight,  color: T.peach },
});

const EMPTY_FORM = { name: '', email: '', password: '', role: 'atencion' };

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function Users() {
  const { dark } = useThemeStore();
  const { user: me } = useAuthStore();
  const T = dark ? DARK : LIGHT;

  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null); // null | 'new' | user
  const [form, setForm]     = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try { setUsers(await api.get('/users')); }
    finally { setLoading(false); }
  }

  function openNew() { setForm({ ...EMPTY_FORM }); setError(''); setModal('new'); }
  function openEdit(u) { setForm({ name: u.name, email: u.email, password: '', role: u.role }); setError(''); setModal(u); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (modal !== 'new' && !payload.password) delete payload.password;
      if (modal === 'new') await api.post('/users', payload);
      else await api.put(`/users/${modal.id}`, payload);
      await fetchUsers();
      setModal(null);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleToggle(u) {
    if (u.id === me?.id) return alert('No puedes desactivar tu propia cuenta');
    try {
      const updated = await api.patch(`/users/${u.id}/toggle`, {});
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: updated.active } : x));
    } catch (err) { alert(err.message); }
  }

  const roleColors = ROLE_COLORS(T);
  const card  = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 };
  const inp   = (x = {}) => ({ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font, ...x });
  const lbl   = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const btnP  = (x = {}) => ({ padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, ...x });
  const btnG  = (x = {}) => ({ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font, ...x });

  return (
    <div>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button onClick={openNew} style={btnP()}>+ Nuevo usuario</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>Cargando...</div>
        ) : users.map((u, i) => {
          const rc = roleColors[u.role] || roleColors.atencion;
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < users.length - 1 ? `1px solid ${T.borderLight}` : 'none', opacity: u.active ? 1 : 0.5 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2d2d2d', flexShrink: 0 }}>
                {initials(u.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: rc.bg, color: rc.color, flexShrink: 0 }}>
                {ROLES.find(r => r.value === u.role)?.label || u.role}
              </span>
              <button onClick={() => handleToggle(u)} style={btnG({ fontSize: 12, color: u.active ? T.danger : T.accentDark, borderColor: u.active ? T.danger + '44' : T.accent + '44' })}>
                {u.active ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => openEdit(u)} style={btnG({ fontSize: 12 })}>Editar</button>
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, border: `1px solid ${T.border}`, boxShadow: T.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                {modal === 'new' ? 'Nuevo usuario' : 'Editar usuario'}
              </div>
              <button onClick={() => setModal(null)} style={btnG({ padding: '5px 10px' })}>✕</button>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>{error}</div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={lbl}>Nombre completo *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp()} placeholder="Nombre Apellido" />
                </div>
                <div>
                  <label style={lbl}>Correo *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp()} placeholder="correo@empresa.com" />
                </div>
                <div>
                  <label style={lbl}>{modal === 'new' ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
                  <input type="password" required={modal === 'new'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inp()} placeholder="••••••••" />
                </div>
                <div>
                  <label style={lbl}>Rol *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inp({ cursor: 'pointer' })}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setModal(null)} style={btnG({ flex: 1 })}>Cancelar</button>
                <button type="submit" disabled={saving} style={btnP({ flex: 2, opacity: saving ? 0.7 : 1 })}>
                  {saving ? 'Guardando...' : modal === 'new' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
