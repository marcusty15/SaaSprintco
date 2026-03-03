import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font, avatarColors } from '../lib/theme';
import { api } from '../lib/api';

const STATION_LABELS = {
  recepcion: 'Recepción', diseno: 'Diseño', impresion: 'Impresión',
  acabados: 'Acabados', control_calidad: 'Control Calidad', retiro: 'Retiro',
};
const PRIORITY_LABELS = { 1: 'Normal', 2: 'Urgente', 3: 'Express' };
const PRIORITY_COLORS = (T) => ({
  1: { bg: T.surface2,    color: T.textLight },
  2: { bg: T.yellowLight, color: T.yellow },
  3: { bg: T.peachLight,  color: T.peach },
});
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Pago móvil', 'Zelle', 'Divisas'];
const EMPTY_FORM = { client_id: '', notes: '', due_date: '', priority: 1, total_ves: '' };

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function Orders() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const [orders, setOrders]     = useState([]);
  const [clients, setClients]   = useState([]);
  const [quotes, setQuotes]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [quoteId, setQuoteId]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Modal cobro
  const [payModal, setPayModal]     = useState(null); // null | order
  const [payMethod, setPayMethod]   = useState('Efectivo');
  const [payTotal, setPayTotal]     = useState('');
  const [paying, setPaying]         = useState(false);

  useEffect(() => {
    Promise.all([
      fetchOrders(),
      api.get('/clients').then(setClients),
      api.get('/quotes').then(d => setQuotes(d.filter(q => q.status === 'approved'))),
    ]);
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try { setOrders(await api.get('/orders')); }
    finally { setLoading(false); }
  }

  async function handleAdvance(id) {
    try {
      await api.patch(`/orders/${id}/advance`, {});
      await fetchOrders();
    } catch (err) { alert(err.message); }
  }

  async function handleDeliver(id) {
    try {
      await api.patch(`/orders/${id}/deliver`, {});
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'delivered' } : o));
    } catch (err) { alert(err.message); }
  }

  function openPayModal(order) {
    setPayModal(order);
    setPayMethod('Efectivo');
    setPayTotal(order.total_ves ? String(parseFloat(order.total_ves).toFixed(2)) : '');
  }

  async function handlePay(e) {
    e.preventDefault();
    setPaying(true);
    try {
      await api.patch(`/orders/${payModal.id}/pay`, { payment_method: payMethod, total_ves: payTotal ? parseFloat(payTotal) : undefined });
      setOrders(prev => prev.map(o => o.id === payModal.id ? { ...o, paid: true, payment_method: payMethod } : o));
      setPayModal(null);
    } catch (err) { alert(err.message); }
    finally { setPaying(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const selectedQuote = quotes.find(q => q.id === parseInt(quoteId));
      await api.post('/orders', {
        client_id:  selectedQuote ? selectedQuote.client_id : (form.client_id ? parseInt(form.client_id) : null),
        quote_id:   quoteId ? parseInt(quoteId) : null,
        notes: form.notes, due_date: form.due_date || null,
        priority: parseInt(form.priority),
        total_ves: form.total_ves ? parseFloat(form.total_ves) : null,
      });
      await fetchOrders();
      setModal(false); setForm({ ...EMPTY_FORM }); setQuoteId('');
    } catch (err) { setError(err.message || 'Error al crear'); }
    finally { setSaving(false); }
  }

  const columns = [
    { key: 'production', title: 'En producción',      color: T.yellow,    items: orders.filter(o => o.status === 'pending' || o.status === 'in_progress') },
    { key: 'completed',  title: 'Listos para entregar', color: T.success,  items: orders.filter(o => o.status === 'completed') },
    { key: 'delivered',  title: 'Entregados hoy',      color: T.textLight, items: orders.filter(o => {
      if (o.status !== 'delivered') return false;
      return new Date(o.updated_at).toDateString() === new Date().toDateString();
    })},
  ];

  const card  = (x = {}) => ({ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, ...x });
  const inp   = (x = {}) => ({ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box', fontFamily: font, ...x });
  const lbl   = { fontSize: 12, color: T.textMid, fontWeight: 600, display: 'block', marginBottom: 6 };
  const btnP  = (x = {}) => ({ padding: '9px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, ...x });
  const btnG  = (x = {}) => ({ padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font, ...x });
  const priColors = PRIORITY_COLORS(T);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => { setModal(true); setError(''); setForm({ ...EMPTY_FORM }); setQuoteId(''); }} style={btnP()}>
          + Nueva orden
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.textLight, fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {columns.map(col => (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1 }}>{col.title}</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: col.color + '33', color: col.color }}>
                  {col.items.length}
                </div>
              </div>

              {col.items.length === 0 ? (
                <div style={{ ...card({ padding: 32 }), textAlign: 'center', color: T.textLight, fontSize: 13, border: `1px dashed ${T.border}` }}>Sin órdenes</div>
              ) : col.items.map((o, i) => {
                const progress = o.total_stations > 0 ? Math.round((o.done_stations / o.total_stations) * 100) : 0;
                const pri = priColors[o.priority] || priColors[1];
                return (
                  <div key={o.id} style={card({ marginBottom: 12 })}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{o.code}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {o.paid && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: T.accentLight, color: T.accentDark }}>💰 Cobrado</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: pri.bg, color: pri.color }}>{PRIORITY_LABELS[o.priority]}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#2d2d2d', flexShrink: 0 }}>
                        {initials(o.client_name)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{o.client_name || 'Sin cliente'}</div>
                    </div>

                    {o.current_station && (
                      <div style={{ fontSize: 11, color: T.textMid, marginBottom: 10 }}>
                        {STATION_LABELS[o.current_station] || o.current_station}
                        {o.current_operator && ` · ${o.current_operator}`}
                      </div>
                    )}

                    <div style={{ height: 5, background: T.borderLight, borderRadius: 4, marginBottom: 12 }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? T.success : T.accent, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>

                    {o.due_date && (
                      <div style={{ fontSize: 11, color: T.textLight, marginBottom: 10 }}>
                        Entrega: {new Date(o.due_date).toLocaleDateString('es-VE')}
                      </div>
                    )}

                    {/* Botones */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {o.status === 'completed' && (
                        <button onClick={() => handleDeliver(o.id)} style={btnP({ fontSize: 12, background: T.accentLight, color: T.accentDark })}>
                          ✓ Confirmar entrega
                        </button>
                      )}
                      {(o.status === 'pending' || o.status === 'in_progress') && (
                        <button onClick={() => handleAdvance(o.id)} style={btnG({ fontSize: 12 })}>→ Avanzar estación</button>
                      )}
                      {o.status === 'delivered' && (
                        <div style={{ fontSize: 11, color: T.success, fontWeight: 600, textAlign: 'center' }}>✓ Entregado</div>
                      )}
                      {!o.paid && (
                        <button onClick={() => openPayModal(o)} style={btnG({ fontSize: 12, color: T.accentDark, borderColor: T.accent + '66' })}>
                          💰 Cobrar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Registrar cobro */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, border: `1px solid ${T.border}`, boxShadow: T.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Registrar cobro</div>
              <button onClick={() => setPayModal(null)} style={btnG({ padding: '5px 10px' })}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: T.textMid, marginBottom: 20 }}>
              {payModal.code} · {payModal.client_name || 'Sin cliente'}
            </div>
            <form onSubmit={handlePay}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Método de pago</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inp({ cursor: 'pointer' })}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Monto (Bs)</label>
                <input type="number" min="0" step="0.01" value={payTotal} onChange={e => setPayTotal(e.target.value)} style={inp()} placeholder="0.00" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setPayModal(null)} style={btnG({ flex: 1 })}>Cancelar</button>
                <button type="submit" disabled={paying} style={btnP({ flex: 2, opacity: paying ? 0.7 : 1 })}>
                  {paying ? 'Registrando...' : '✓ Confirmar cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva orden */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, border: `1px solid ${T.border}`, boxShadow: T.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Nueva orden de trabajo</div>
              <button onClick={() => setModal(false)} style={btnG({ padding: '5px 10px' })}>✕</button>
            </div>
            {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.peachLight, border: `1px solid ${T.danger}44`, fontSize: 13, color: T.danger }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={lbl}>Desde presupuesto aprobado (opcional)</label>
                  <select value={quoteId} onChange={e => setQuoteId(e.target.value)} style={inp({ cursor: 'pointer' })}>
                    <option value="">— Crear sin presupuesto —</option>
                    {quotes.map(q => <option key={q.id} value={q.id}>{q.code} · {q.client_name || 'Sin cliente'} · {q.currency} {parseFloat(q.subtotal).toFixed(2)}</option>)}
                  </select>
                </div>
                {!quoteId && (
                  <div>
                    <label style={lbl}>Cliente</label>
                    <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={inp({ cursor: 'pointer' })}>
                      <option value="">— Sin cliente —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>Prioridad</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp({ cursor: 'pointer' })}>
                      <option value={1}>Normal</option>
                      <option value={2}>Urgente</option>
                      <option value={3}>Express</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Fecha de entrega</label>
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inp()} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Notas</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp(), resize: 'vertical', minHeight: 60 }} placeholder="Instrucciones especiales..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setModal(false)} style={btnG({ flex: 1 })}>Cancelar</button>
                <button type="submit" disabled={saving} style={btnP({ flex: 2, opacity: saving ? 0.7 : 1 })}>
                  {saving ? 'Creando...' : 'Crear orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
