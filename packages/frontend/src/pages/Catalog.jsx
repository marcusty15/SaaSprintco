import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font } from '../lib/theme';
import { api } from '../lib/api';

const TABS = ['Materiales', 'Procesos', 'Acabados'];
const UNITS = ['m2', 'unidad', 'metro_lineal'];

const EMPTY_MATERIAL  = { name: '', description: '', unit: 'm2', price_per_unit: '', currency: 'USD' };
const EMPTY_PROCESS   = { name: '', description: '', cost_per_hour: '', labor_rate: '', currency: 'USD' };
const EMPTY_FINISHING = { name: '', description: '', cost_per_unit: '', currency: 'USD' };

export default function Catalog() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const [tab, setTab]       = useState(0);
  const [data, setData]     = useState({ materials: [], processes: [], finishings: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null); // null | 'new' | item
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [materials, processes, finishings] = await Promise.all([
        api.get('/catalog/materials'),
        api.get('/catalog/processes'),
        api.get('/catalog/finishings'),
      ]);
      setData({ materials, processes, finishings });
    } finally { setLoading(false); }
  }

  const endpoints = ['/catalog/materials', '/catalog/processes', '/catalog/finishings'];
  const lists     = [data.materials, data.processes, data.finishings];
  const empties   = [EMPTY_MATERIAL, EMPTY_PROCESS, EMPTY_FINISHING];

  function openNew() {
    setForm({ ...empties[tab] });
    setError('');
    setModal('new');
  }

  function openEdit(item) {
    setForm({ ...item });
    setError('');
    setModal(item);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'new') {
        await api.post(endpoints[tab], form);
      } else {
        await api.put(`${endpoints[tab]}/${modal.id}`, form);
      }
      await fetchAll();
      setModal(null);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('¿Desactivar este elemento del catálogo?')) return;
    try {
      await api.delete(`${endpoints[tab]}/${id}`);
      await fetchAll();
    } catch (err) { alert(err.message); }
  }

  const f = (field) => form[field] ?? '';
  const upd = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const card  = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 };
  const inp   = (x = {}) => ({ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font, ...x });
  const lbl   = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const btnP  = (x = {}) => ({ padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, ...x });
  const btnG  = (x = {}) => ({ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font, ...x });
  const btnDel = (x = {}) => ({ padding: '7px 12px', borderRadius: 10, border: `1px solid ${T.danger}44`, background: 'transparent', color: T.danger, fontSize: 12, cursor: 'pointer', fontFamily: font, ...x });

  const currentList = lists[tab];

  return (
    <div>
      {/* Tabs + acción */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => { setTab(i); setModal(null); }} style={{
            padding: '7px 18px', borderRadius: 20, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: font,
            fontSize: 13, fontWeight: 600,
            background: tab === i ? T.accentLight : T.surface2,
            color:      tab === i ? T.accentDark  : T.textMid,
          }}>{t}</button>
        ))}
        <button onClick={openNew} style={btnP({ marginLeft: 'auto' })}>+ Agregar</button>
      </div>

      {/* Lista */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>Cargando...</div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>
            <div style={{ fontSize: 24, opacity: 0.4, marginBottom: 8 }}>◈</div>
            Sin elementos — agrega el primero
          </div>
        ) : currentList.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < currentList.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</div>
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>
                {tab === 0 && `${item.unit} · ${item.currency} ${parseFloat(item.price_per_unit).toFixed(2)}/unidad`}
                {tab === 1 && `${item.currency} ${parseFloat(item.cost_per_hour).toFixed(2)}/hora · M.O. ${parseFloat(item.labor_rate).toFixed(2)}/hora`}
                {tab === 2 && `${item.currency} ${parseFloat(item.cost_per_unit).toFixed(2)}/unidad`}
                {item.description && ` · ${item.description}`}
              </div>
            </div>
            <button onClick={() => openEdit(item)} style={btnG({ fontSize: 12 })}>Editar</button>
            <button onClick={() => handleDelete(item.id)} style={btnDel()}>✕</button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, border: `1px solid ${T.border}`, boxShadow: T.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                {modal === 'new' ? `Nuevo — ${TABS[tab]}` : `Editar — ${TABS[tab]}`}
              </div>
              <button onClick={() => setModal(null)} style={btnG({ padding: '5px 10px' })}>✕</button>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>{error}</div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gap: 14 }}>

                {/* Campos comunes */}
                <div>
                  <label style={lbl}>Nombre *</label>
                  <input required value={f('name')} onChange={e => upd('name', e.target.value)} style={inp()} placeholder="Nombre del elemento" />
                </div>
                <div>
                  <label style={lbl}>Descripción</label>
                  <input value={f('description')} onChange={e => upd('description', e.target.value)} style={inp()} placeholder="Descripción opcional" />
                </div>

                {/* Materiales */}
                {tab === 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Unidad *</label>
                      <select value={f('unit')} onChange={e => upd('unit', e.target.value)} style={inp({ cursor: 'pointer' })}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Precio/unidad *</label>
                      <input required type="number" min="0" step="0.01" value={f('price_per_unit')} onChange={e => upd('price_per_unit', e.target.value)} style={inp()} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={lbl}>Moneda</label>
                      <select value={f('currency')} onChange={e => upd('currency', e.target.value)} style={inp({ cursor: 'pointer' })}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Procesos */}
                {tab === 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Costo/hora *</label>
                      <input required type="number" min="0" step="0.01" value={f('cost_per_hour')} onChange={e => upd('cost_per_hour', e.target.value)} style={inp()} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={lbl}>M.O./hora</label>
                      <input type="number" min="0" step="0.01" value={f('labor_rate')} onChange={e => upd('labor_rate', e.target.value)} style={inp()} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={lbl}>Moneda</label>
                      <select value={f('currency')} onChange={e => upd('currency', e.target.value)} style={inp({ cursor: 'pointer' })}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Acabados */}
                {tab === 2 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Costo/unidad *</label>
                      <input required type="number" min="0" step="0.01" value={f('cost_per_unit')} onChange={e => upd('cost_per_unit', e.target.value)} style={inp()} placeholder="0.00" />
                    </div>
                    <div>
                      <label style={lbl}>Moneda</label>
                      <select value={f('currency')} onChange={e => upd('currency', e.target.value)} style={inp({ cursor: 'pointer' })}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setModal(null)} style={btnG({ flex: 1 })}>Cancelar</button>
                <button type="submit" disabled={saving} style={btnP({ flex: 2, opacity: saving ? 0.7 : 1 })}>
                  {saving ? 'Guardando...' : modal === 'new' ? 'Agregar' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
