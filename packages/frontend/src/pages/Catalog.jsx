import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font } from '../lib/theme';
import { api } from '../lib/api';

const TABS  = ['Materiales', 'Procesos', 'Acabados', 'Reglas'];
const UNITS = ['m2', 'unidad', 'metro_lineal'];

const EMPTY_MATERIAL  = { name: '', description: '', unit: 'm2', price_per_unit: '', currency: 'USD' };
const EMPTY_PROCESS   = { name: '', description: '', cost_per_hour: '', labor_rate: '', currency: 'USD' };
const EMPTY_FINISHING = { name: '', description: '', cost_per_unit: '', currency: 'USD' };
const EMPTY_RULE      = {
  material_id: '', process_id: '',
  min_dpi: '', bleed_mm: '', safe_zone_mm: '', color_mode: '',
  accepted_formats: '',
  print_speed: '', print_passes: '', icc_profile: '',
  cut_speed: '', cut_pressure: '', cut_passes: '', blade_offset_mm: '',
  notes: '',
};

export default function Catalog() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const [tab, setTab]       = useState(0);
  const [data, setData]     = useState({ materials: [], processes: [], finishings: [], rules: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [materials, processes, finishings, rules] = await Promise.all([
        api.get('/catalog/materials'),
        api.get('/catalog/processes'),
        api.get('/catalog/finishings'),
        api.get('/rules'),
      ]);
      setData({ materials, processes, finishings, rules });
    } finally { setLoading(false); }
  }

  const endpoints = ['/catalog/materials', '/catalog/processes', '/catalog/finishings', '/rules'];
  const lists     = [data.materials, data.processes, data.finishings, data.rules];
  const empties   = [EMPTY_MATERIAL, EMPTY_PROCESS, EMPTY_FINISHING, EMPTY_RULE];

  function openNew() {
    setForm({ ...empties[tab] });
    setError('');
    setModal('new');
  }

  function openEdit(item) {
    let formData = { ...item };
    if (tab === 3 && Array.isArray(item.accepted_formats)) {
      formData.accepted_formats = item.accepted_formats.join(', ');
    }
    setError('');
    setModal(item);
    setForm(formData);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      let payload = { ...form };
      if (tab === 3) {
        payload.accepted_formats = form.accepted_formats
          ? form.accepted_formats.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
      if (modal === 'new') await api.post(endpoints[tab], payload);
      else                 await api.put(`${endpoints[tab]}/${modal.id}`, payload);
      await fetchAll();
      setModal(null);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('¿Desactivar este elemento?')) return;
    try {
      await api.delete(`${endpoints[tab]}/${id}`);
      await fetchAll();
    } catch (err) { alert(err.message); }
  }

  const f   = (field) => form[field] ?? '';
  const upd = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const card   = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 };
  const inp    = (x = {}) => ({ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font, ...x });
  const lbl    = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const sec    = { fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, marginBottom: 2 };
  const btnP   = (x = {}) => ({ padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, ...x });
  const btnG   = (x = {}) => ({ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font, ...x });
  const btnDel = (x = {}) => ({ padding: '7px 12px', borderRadius: 10, border: `1px solid ${T.danger}44`, background: 'transparent', color: T.danger, fontSize: 12, cursor: 'pointer', fontFamily: font, ...x });

  const currentList = lists[tab];

  // Subtítulo por tab para cada item de la lista
  function itemSubtitle(item) {
    if (tab === 0) return `${item.unit} · ${item.currency} ${parseFloat(item.price_per_unit).toFixed(2)}/unidad${item.description ? ' · ' + item.description : ''}`;
    if (tab === 1) return `${item.currency} ${parseFloat(item.cost_per_hour).toFixed(2)}/hora · M.O. ${parseFloat(item.labor_rate).toFixed(2)}/hora${item.description ? ' · ' + item.description : ''}`;
    if (tab === 2) return `${item.currency} ${parseFloat(item.cost_per_unit).toFixed(2)}/unidad${item.description ? ' · ' + item.description : ''}`;
    if (tab === 3) {
      const parts = [
        item.material_name + (item.process_name ? ' + ' + item.process_name : ' · genérica'),
        item.min_dpi      ? `${item.min_dpi} dpi`     : null,
        item.color_mode   ? item.color_mode            : null,
        item.bleed_mm     ? `${item.bleed_mm}mm sangrado` : null,
      ].filter(Boolean);
      return parts.join(' · ');
    }
    return '';
  }

  // Nombre principal por tab
  function itemName(item) {
    if (tab === 3) return `${item.material_name}${item.process_name ? ' + ' + item.process_name : ''}`;
    return item.name;
  }

  return (
    <div>
      {/* Tabs */}
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
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{itemName(item)}</div>
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{itemSubtitle(item)}</div>
            </div>
            <button onClick={() => openEdit(item)} style={btnG({ fontSize: 12 })}>Editar</button>
            <button onClick={() => handleDelete(item.id)} style={btnDel()}>✕</button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, overflowY: 'auto' }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: tab === 3 ? 640 : 460, border: `1px solid ${T.border}`, boxShadow: T.shadowMd, margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                {modal === 'new' ? `Nueva regla de producción` : `Editar regla — ${tab < 3 ? TABS[tab] : ''}`}
              </div>
              <button onClick={() => setModal(null)} style={btnG({ padding: '5px 10px' })}>✕</button>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>{error}</div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gap: 14 }}>

                {/* Materiales / Procesos / Acabados — nombre y descripción comunes */}
                {tab < 3 && (
                  <>
                    <div>
                      <label style={lbl}>Nombre *</label>
                      <input required value={f('name')} onChange={e => upd('name', e.target.value)} style={inp()} placeholder="Nombre del elemento" />
                    </div>
                    <div>
                      <label style={lbl}>Descripción</label>
                      <input value={f('description')} onChange={e => upd('description', e.target.value)} style={inp()} placeholder="Descripción opcional" />
                    </div>
                  </>
                )}

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

                {/* ── REGLAS ─────────────────────────────────────────────────────── */}
                {tab === 3 && (
                  <>
                    {/* Asociación */}
                    <div style={sec}>Asociación</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Material *</label>
                        <select required value={f('material_id')} onChange={e => upd('material_id', e.target.value)} style={inp({ cursor: 'pointer' })}>
                          <option value="">— Seleccionar —</option>
                          {data.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Proceso (opcional)</label>
                        <select value={f('process_id')} onChange={e => upd('process_id', e.target.value)} style={inp({ cursor: 'pointer' })}>
                          <option value="">— Genérico (todos los procesos) —</option>
                          {data.processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Specs de archivo */}
                    <div style={sec}>Especificaciones de archivo</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>DPI mínimo</label>
                        <input type="number" min="0" value={f('min_dpi')} onChange={e => upd('min_dpi', e.target.value)} style={inp()} placeholder="300" />
                      </div>
                      <div>
                        <label style={lbl}>Sangrado (mm)</label>
                        <input type="number" min="0" step="0.5" value={f('bleed_mm')} onChange={e => upd('bleed_mm', e.target.value)} style={inp()} placeholder="3" />
                      </div>
                      <div>
                        <label style={lbl}>Zona segura (mm)</label>
                        <input type="number" min="0" step="0.5" value={f('safe_zone_mm')} onChange={e => upd('safe_zone_mm', e.target.value)} style={inp()} placeholder="5" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Modo de color</label>
                        <select value={f('color_mode')} onChange={e => upd('color_mode', e.target.value)} style={inp({ cursor: 'pointer' })}>
                          <option value="">— Sin especificar —</option>
                          <option value="CMYK">CMYK</option>
                          <option value="RGB">RGB</option>
                          <option value="Grayscale">Grayscale</option>
                          <option value="Pantone">Pantone</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Formatos aceptados (separados por coma)</label>
                        <input value={f('accepted_formats')} onChange={e => upd('accepted_formats', e.target.value)} style={inp()} placeholder="PDF, AI, EPS, TIFF" />
                      </div>
                    </div>

                    {/* Parámetros de impresión */}
                    <div style={sec}>Parámetros de impresión</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Velocidad (m²/h)</label>
                        <input type="number" min="0" step="0.1" value={f('print_speed')} onChange={e => upd('print_speed', e.target.value)} style={inp()} placeholder="0.0" />
                      </div>
                      <div>
                        <label style={lbl}>Pasadas</label>
                        <input type="number" min="0" value={f('print_passes')} onChange={e => upd('print_passes', e.target.value)} style={inp()} placeholder="1" />
                      </div>
                      <div>
                        <label style={lbl}>Perfil ICC</label>
                        <input value={f('icc_profile')} onChange={e => upd('icc_profile', e.target.value)} style={inp()} placeholder="ej. USWebCoatedSWOP" />
                      </div>
                    </div>

                    {/* Parámetros de corte */}
                    <div style={sec}>Parámetros de corte digital</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Vel. corte (mm/s)</label>
                        <input type="number" min="0" value={f('cut_speed')} onChange={e => upd('cut_speed', e.target.value)} style={inp()} placeholder="0" />
                      </div>
                      <div>
                        <label style={lbl}>Presión (gf)</label>
                        <input type="number" min="0" value={f('cut_pressure')} onChange={e => upd('cut_pressure', e.target.value)} style={inp()} placeholder="0" />
                      </div>
                      <div>
                        <label style={lbl}>Pasadas</label>
                        <input type="number" min="0" value={f('cut_passes')} onChange={e => upd('cut_passes', e.target.value)} style={inp()} placeholder="1" />
                      </div>
                      <div>
                        <label style={lbl}>Offset cuchillo (mm)</label>
                        <input type="number" min="0" step="0.001" value={f('blade_offset_mm')} onChange={e => upd('blade_offset_mm', e.target.value)} style={inp()} placeholder="0.000" />
                      </div>
                    </div>

                    {/* Notas */}
                    <div>
                      <label style={lbl}>Notas para el operario</label>
                      <textarea value={f('notes')} onChange={e => upd('notes', e.target.value)}
                        rows={3} style={{ ...inp(), resize: 'vertical' }}
                        placeholder="Instrucciones especiales, advertencias, etc." />
                    </div>
                  </>
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
