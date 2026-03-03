import { useState, useEffect, useCallback } from 'react';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font, avatarColors } from '../lib/theme';
import { api } from '../lib/api';

const EMPTY_ITEM = { material_id: '', process_id: '', quantity: 1, width_cm: '', height_cm: '', machine_hours: 0.5, finishing_ids: [] };

const STATUS_CONFIG = {
  draft:    { label: 'Borrador',   bg: null, color: null },
  sent:     { label: 'Enviado',    bg: 'blueLight',   color: 'blue' },
  approved: { label: 'Aprobado',   bg: 'accentLight', color: 'accentDark' },
  rejected: { label: 'Rechazado', bg: 'peachLight',  color: 'danger' },
  expired:  { label: 'Expirado',  bg: null,           color: null },
};

function Badge({ status, T }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
      background: cfg.bg ? T[cfg.bg] : T.surface2,
      color: cfg.color ? T[cfg.color] : T.textLight,
    }}>
      {cfg.label}
    </span>
  );
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function Quotes() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const [view, setView]             = useState('list');
  const [quotes, setQuotes]         = useState([]);
  const [clients, setClients]       = useState([]);
  const [catalog, setCatalog]       = useState({ materials: [], processes: [], finishings: [] });
  const [loadingList, setLoadingList] = useState(true);

  // Form
  const [clientId, setClientId]     = useState('');
  const [currency, setCurrency]     = useState('USD');
  const [notes, setNotes]           = useState('');
  const [items, setItems]           = useState([{ ...EMPTY_ITEM }]);
  const [calculation, setCalculation] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      fetchQuotes(),
      api.get('/clients').then(d => setClients(d)),
      Promise.all([
        api.get('/catalog/materials'),
        api.get('/catalog/processes'),
        api.get('/catalog/finishings'),
      ]).then(([materials, processes, finishings]) => setCatalog({ materials, processes, finishings })),
    ]);
  }, []);

  async function fetchQuotes() {
    setLoadingList(true);
    try {
      const data = await api.get('/quotes');
      setQuotes(data);
    } finally {
      setLoadingList(false);
    }
  }

  // Cálculo en tiempo real con debounce
  useEffect(() => {
    const timer = setTimeout(() => runCalculation(), 600);
    return () => clearTimeout(timer);
  }, [items, currency]);

  async function runCalculation() {
    const valid = items.filter(it => it.material_id && it.process_id && it.quantity > 0 && it.machine_hours > 0);
    if (valid.length === 0) { setCalculation(null); return; }
    setCalculating(true);
    try {
      const result = await api.post('/quotes/calculate', {
        currency,
        items: valid.map(it => ({
          material_id:   parseInt(it.material_id),
          process_id:    parseInt(it.process_id),
          quantity:      parseInt(it.quantity),
          width_cm:      it.width_cm  ? parseFloat(it.width_cm)  : undefined,
          height_cm:     it.height_cm ? parseFloat(it.height_cm) : undefined,
          machine_hours: parseFloat(it.machine_hours),
          finishing_ids: it.finishing_ids,
        })),
      });
      setCalculation(result);
    } catch { setCalculation(null); }
    finally { setCalculating(false); }
  }

  function updateItem(i, field, value) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  function toggleFinishing(itemIdx, fid) {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== itemIdx) return it;
      const has = it.finishing_ids.includes(fid);
      return { ...it, finishing_ids: has ? it.finishing_ids.filter(id => id !== fid) : [...it.finishing_ids, fid] };
    }));
  }

  function addItem()    { setItems(prev => [...prev, { ...EMPTY_ITEM }]); }
  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  function resetForm() {
    setClientId(''); setCurrency('USD'); setNotes('');
    setItems([{ ...EMPTY_ITEM }]); setCalculation(null); setFormError('');
  }

  async function handleSave(status) {
    const validItems = items.filter(it => it.material_id && it.process_id && it.quantity > 0 && it.machine_hours > 0);
    if (validItems.length === 0) { setFormError('Completa al menos un ítem (material, proceso, cantidad y horas)'); return; }
    setFormError(''); setSaving(true);
    try {
      await api.post('/quotes', {
        client_id: clientId ? parseInt(clientId) : null,
        currency, notes, status,
        items: validItems.map(it => ({
          material_id:   parseInt(it.material_id),
          process_id:    parseInt(it.process_id),
          quantity:      parseInt(it.quantity),
          width_cm:      it.width_cm  ? parseFloat(it.width_cm)  : null,
          height_cm:     it.height_cm ? parseFloat(it.height_cm) : null,
          machine_hours: parseFloat(it.machine_hours),
          finishing_ids: it.finishing_ids,
        })),
      });
      await fetchQuotes();
      resetForm();
      setView('list');
    } catch (err) {
      setFormError(err.message || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function changeStatus(id, status) {
    try {
      await api.patch(`/quotes/${id}/status`, { status });
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    } catch (err) { alert(err.message); }
  }

  const filtered = statusFilter === 'all' ? quotes : quotes.filter(q => q.status === statusFilter);

  const card  = (x = {}) => ({ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, ...x });
  const inp   = (x = {}) => ({ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font, ...x });
  const lbl   = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const secTi = { fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 };
  const btnP  = (x = {}) => ({ padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, ...x });
  const btnG  = (x = {}) => ({ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font, ...x });

  // ─── LISTA ────────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={card()}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all','Todos'],['draft','Borradores'],['approved','Aprobados'],['sent','Enviados'],['rejected','Rechazados']].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: font,
            fontSize: 12, fontWeight: 600,
            background: statusFilter === val ? T.accentLight : T.surface2,
            color:      statusFilter === val ? T.accentDark  : T.textMid,
          }}>{label}</button>
        ))}
        <button onClick={() => { resetForm(); setView('new'); }} style={btnP({ marginLeft: 'auto' })}>+ Nuevo</button>
      </div>

      {loadingList ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>◇</div>
          No hay presupuestos aún
        </div>
      ) : filtered.map((q, i) => (
        <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#2d2d2d', flexShrink: 0 }}>
            {initials(q.client_name || '?')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{q.client_name || 'Sin cliente'}</div>
            <div style={{ fontSize: 11, color: T.textLight }}>{q.code} · {new Date(q.created_at).toLocaleDateString('es-VE')}</div>
          </div>
          <Badge status={q.status} T={T} />
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text, flexShrink: 0 }}>
            {q.currency} {parseFloat(q.subtotal).toFixed(2)}
          </div>
          {q.status === 'draft' && (
            <button onClick={() => changeStatus(q.id, 'approved')} style={btnG({ fontSize: 12, color: T.accentDark, borderColor: T.accent + '66' })}>
              ✓ Aprobar
            </button>
          )}
        </div>
      ))}
    </div>
  );

  // ─── NUEVO PRESUPUESTO ─────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 860 }}>

      {/* Cliente + Moneda */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card()}>
          <div style={secTi}>Cliente</div>
          <label style={lbl}>Seleccionar cliente</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} style={inp({ cursor: 'pointer' })}>
            <option value="">— Sin cliente —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={card()}>
          <div style={secTi}>Moneda</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['USD', 'EUR'].map(cur => (
              <div key={cur} onClick={() => setCurrency(cur)} style={{ padding: 16, borderRadius: 12, border: `2px solid ${currency === cur ? T.accent : T.border}`, background: currency === cur ? T.accentLight : T.surface2, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: currency === cur ? T.accentDark : T.text }}>{cur === 'USD' ? '$' : '€'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: currency === cur ? T.accentDark : T.textMid }}>{cur}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ítems */}
      {items.map((item, idx) => (
        <div key={idx} style={{ ...card(), marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={secTi}>Ítem {idx + 1}</div>
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} style={{ ...btnG(), fontSize: 12, color: T.danger, borderColor: T.danger + '44', padding: '4px 10px' }}>✕ Eliminar</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Material</label>
              <select value={item.material_id} onChange={e => updateItem(idx, 'material_id', e.target.value)} style={inp({ cursor: 'pointer' })}>
                <option value="">Seleccionar...</option>
                {catalog.materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Proceso / Máquina</label>
              <select value={item.process_id} onChange={e => updateItem(idx, 'process_id', e.target.value)} style={inp({ cursor: 'pointer' })}>
                <option value="">Seleccionar...</option>
                {catalog.processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Cantidad</label>
              <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} style={inp()} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Ancho (cm)</label>
              <input type="number" min="0" placeholder="0" value={item.width_cm} onChange={e => updateItem(idx, 'width_cm', e.target.value)} style={inp()} />
            </div>
            <div>
              <label style={lbl}>Alto (cm)</label>
              <input type="number" min="0" placeholder="0" value={item.height_cm} onChange={e => updateItem(idx, 'height_cm', e.target.value)} style={inp()} />
            </div>
            <div>
              <label style={lbl}>Horas máquina</label>
              <input type="number" min="0" step="0.1" value={item.machine_hours} onChange={e => updateItem(idx, 'machine_hours', e.target.value)} style={inp()} />
            </div>
          </div>

          {/* Acabados */}
          {catalog.finishings.length > 0 && (
            <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 14 }}>
              <div style={{ ...secTi, marginBottom: 10 }}>Acabados</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {catalog.finishings.map(f => {
                  const active = item.finishing_ids.includes(f.id);
                  return (
                    <div key={f.id} onClick={() => toggleFinishing(idx, f.id)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? T.accent : T.border}`, background: active ? T.accentLight : T.surface2, color: active ? T.accentDark : T.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {f.name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={addItem} style={{ ...btnG(), width: '100%', marginBottom: 16, padding: 12, borderStyle: 'dashed' }}>
        + Agregar ítem
      </button>

      {/* Notas */}
      <div style={{ ...card(), marginBottom: 16 }}>
        <label style={lbl}>Notas internas</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp(), resize: 'vertical', minHeight: 60 }} placeholder="Observaciones, instrucciones especiales..." />
      </div>

      {/* Total */}
      <div style={{ background: T.accentLight, borderRadius: 16, padding: 20, border: `1px solid ${T.accent}44`, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: T.accentDark, fontWeight: 600, marginBottom: 4 }}>
              {calculating ? 'Calculando...' : 'Total estimado'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: T.accentDark, letterSpacing: '-1px' }}>
              {calculation ? `${calculation.currency} ${calculation.subtotal.toFixed(2)}` : `${currency} 0.00`}
            </div>
            {!calculation && <div style={{ fontSize: 11, color: T.accent, marginTop: 4 }}>Completá los datos para calcular</div>}
          </div>
          {calculation && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: T.textMid }}>Tasa: {calculation.exchange_rate_used}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.accentDark }}>Bs {calculation.total_ves?.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>

      {formError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>
          {formError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { resetForm(); setView('list'); }} style={btnG({ flex: 1 })}>← Volver</button>
        <button onClick={() => handleSave('draft')} disabled={saving} style={btnG({ flex: 1, opacity: saving ? 0.7 : 1 })}>
          Guardar borrador
        </button>
        <button onClick={() => handleSave('approved')} disabled={saving} style={btnP({ flex: 2, opacity: saving ? 0.7 : 1 })}>
          ✓ Aprobar presupuesto
        </button>
      </div>
    </div>
  );
}
