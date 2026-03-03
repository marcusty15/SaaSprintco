import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font, avatarColors } from '../lib/theme';
import { api } from '../lib/api';

const EMPTY_FORM = { name: '', email: '', phone: '', rif: '', address: '', notes: '' };

function initials(name) {
  return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function Clients() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const [clients, setClients]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'create' | client object
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const data = await api.get('/clients');
      setClients(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setError('');
    setModal('create');
  }

  function openEdit(client) {
    setForm({
      name:    client.name    || '',
      email:   client.email   || '',
      phone:   client.phone   || '',
      rif:     client.rif     || '',
      address: client.address || '',
      notes:   client.notes   || '',
    });
    setError('');
    setModal(client);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/clients', form);
      } else {
        await api.put(`/clients/${modal.id}`, form);
      }
      await fetchClients();
      setModal(null);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clients/${id}`);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    }
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.rif?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const card   = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 };
  const inp    = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font };
  const lbl    = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const btnP   = { padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font };
  const btnG   = { padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font };
  const btnDel = { padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.danger}44`, background: 'transparent', color: T.danger, fontSize: 13, cursor: 'pointer', fontFamily: font };

  return (
    <div>
      {/* Lista */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            placeholder="Buscar por nombre, RIF, teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, flex: 1 }}
          />
          <button onClick={openCreate} style={btnP}>+ Nuevo cliente</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>◎</div>
            {search ? 'Sin resultados' : 'No hay clientes aún'}
          </div>
        ) : (
          filtered.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2d2d2d', flexShrink: 0 }}>
                {initials(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>
                  {[c.rif, c.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>{c.quote_count} presupuestos</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{c.order_count} órdenes</div>
              </div>
              <button onClick={() => openEdit(c)} style={btnG}>Editar</button>
              <button onClick={() => handleDelete(c.id)} style={btnDel}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, border: `1px solid ${T.border}`, boxShadow: T.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                {modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
              </div>
              <button onClick={() => setModal(null)} style={{ ...btnG, padding: '5px 10px' }}>✕</button>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Nombre *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="Nombre completo o empresa" />
                </div>
                <div>
                  <label style={lbl}>RIF / Cédula</label>
                  <input value={form.rif} onChange={e => setForm(f => ({ ...f, rif: e.target.value }))} style={inp} placeholder="V-12345678" />
                </div>
                <div>
                  <label style={lbl}>Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inp} placeholder="0414-0000000" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Correo</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} placeholder="correo@ejemplo.com" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Dirección</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inp} placeholder="Dirección física" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Notas internas</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, resize: 'vertical', minHeight: 70 }} placeholder="Observaciones, preferencias..." />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(null)} style={{ ...btnG, flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ ...btnP, flex: 2, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : modal === 'create' ? 'Crear cliente' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
