import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font } from '../lib/theme';
import { api } from '../lib/api';

// ─── Configuración de estaciones ─────────────────────────────────────────────
const STATIONS = [
  {
    name: 'recepcion',
    label: 'Recepción',
    icon: '📥',
    color: '#7c9885',
    lightBg: '#e8f0eb',
    description: 'Recibir y verificar el trabajo del cliente',
    action: 'advance',
    actionLabel: 'Enviar a Diseño',
    checklist: [
      'Archivo o arte recibido del cliente',
      'Medidas y dimensiones confirmadas',
      'Cantidad de piezas verificada',
      'Material disponible en stock',
      'Notas especiales del cliente revisadas',
    ],
  },
  {
    name: 'diseno',
    label: 'Diseño',
    icon: '🎨',
    color: '#9585c4',
    lightBg: '#ede8f8',
    description: 'Preparar y verificar el archivo para impresión',
    action: 'advance',
    actionLabel: 'Enviar a Impresión',
    checklist: [
      'Software y versión correctos',
      'Resolución mínima 72 dpi (ideal 300 dpi)',
      'Sangrado y márgenes aplicados correctamente',
      'Archivo en modo de color CMYK',
      'Textos convertidos a curvas o trazados',
      'Archivo exportado en formato correcto',
      'Archivo enviado a la cola de impresión',
    ],
  },
  {
    name: 'impresion',
    label: 'Impresión',
    icon: '🖨️',
    color: '#5a8cbf',
    lightBg: '#dceaf7',
    description: 'Ejecutar la impresión con calidad óptima',
    action: 'advance',
    actionLabel: 'Enviar a Acabados',
    checklist: [
      'Material correcto cargado en la máquina',
      'Configuración de impresión verificada',
      'Prueba de color impresa y aprobada',
      'Colores finales correctos y uniformes',
      'Cantidad completa impresa sin faltantes',
      'Sin defectos visibles (rayas, manchas, cortes)',
    ],
  },
  {
    name: 'acabados',
    label: 'Acabados',
    icon: '✂️',
    color: '#c4855a',
    lightBg: '#f8ede8',
    description: 'Aplicar acabados y terminados del trabajo',
    action: 'advance',
    actionLabel: 'Enviar a Control de Calidad',
    checklist: [
      'Lista de acabados del pedido revisada',
      'Laminado aplicado (si corresponde)',
      'Corte realizado con precisión',
      'Ojales instalados (si corresponde)',
      'Doblado o plegado correcto (si corresponde)',
      'Cantidad final contada y correcta',
      'Trabajo empaquetado con cuidado',
    ],
  },
  {
    name: 'control_calidad',
    label: 'Control de Calidad',
    icon: '🔍',
    color: '#bf855a',
    lightBg: '#f7e8dc',
    description: 'Inspección final antes de entregar',
    action: 'advance',
    actionLabel: 'Aprobar para Retiro',
    checklist: [
      'Trabajo comparado con el arte original',
      'Colores dentro del rango aceptable',
      'Cortes precisos y sin irregularidades',
      'Acabados completos según lo solicitado',
      'Cantidad verificada pieza por pieza',
      'Limpieza y presentación del trabajo',
      'Aprobado — listo para entregar al cliente',
    ],
  },
  {
    name: 'retiro',
    label: 'Retiro',
    icon: '📦',
    color: '#85a4c4',
    lightBg: '#dce8f7',
    description: 'Entrega final al cliente',
    action: 'deliver',
    actionLabel: 'Registrar Entrega',
    checklist: [
      'Trabajo listo y debidamente empaquetado',
      'Cobro registrado en el sistema (pagado)',
      'Paquete identificado con nombre del cliente',
      'Cliente notificado que su pedido está listo',
      'Identidad del cliente verificada al retirar',
      'Material entregado al cliente en mano',
    ],
  },
];

// ─── Utilidades ───────────────────────────────────────────────────────────────
function elapsed(isoString) {
  if (!isoString) return '—';
  const ms = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function priorityLabel(p) {
  if (p >= 3) return { label: 'Express', color: '#e05a5a', bg: '#fde8e8' };
  if (p === 2) return { label: 'Urgente', color: '#c48520', bg: '#fdf2dc' };
  return { label: 'Normal', color: '#7c9885', bg: '#e8f0eb' };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Station() {
  const { user, logout } = useAuthStore();
  const { dark } = useThemeStore();
  const navigate = useNavigate();
  const T = dark ? DARK : LIGHT;

  const [mode, setMode]           = useState('select'); // 'select' | 'work'
  const [activeStation, setActive] = useState(null);    // objeto de STATIONS
  const [counts, setCounts]       = useState({});
  const [queue, setQueue]         = useState([]);
  const [selected, setSelected]   = useState(null);     // orden activa en trabajo
  const [checked, setChecked]     = useState([]);       // índices marcados
  const [acting, setActing]       = useState(false);
  const [loadingQ, setLoadingQ]   = useState(false);
  const [tick, setTick]           = useState(0);        // para refrescar elapsed

  // Refrescar tiempo cada minuto
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Cargar conteos al montar y cada 30s
  const fetchCounts = useCallback(async () => {
    try { setCounts(await api.get('/orders/station/counts')); } catch {}
  }, []);

  useEffect(() => {
    fetchCounts();
    const t = setInterval(fetchCounts, 30_000);
    return () => clearInterval(t);
  }, [fetchCounts]);

  // Cargar cola al entrar en modo trabajo
  const fetchQueue = useCallback(async (stationName) => {
    setLoadingQ(true);
    try {
      const data = await api.get(`/orders/station/${stationName}/queue`);
      setQueue(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch {}
    finally { setLoadingQ(false); }
  }, [selected]);

  function enterStation(st) {
    setActive(st);
    setSelected(null);
    setChecked([]);
    setQueue([]);
    setMode('work');
    fetchQueue(st.name);
  }

  function exitStation() {
    setMode('select');
    setActive(null);
    setSelected(null);
    setChecked([]);
    fetchCounts();
  }

  function selectOrder(order) {
    setSelected(order);
    setChecked([]);
  }

  function toggleCheck(i) {
    setChecked(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }

  const allChecked = activeStation
    ? checked.length === activeStation.checklist.length
    : false;

  async function handleAction() {
    if (!selected || !allChecked) return;
    setActing(true);
    try {
      if (activeStation.action === 'deliver') {
        await api.patch(`/orders/${selected.id}/deliver`, {});
      } else {
        await api.patch(`/orders/${selected.id}/advance`, {});
      }
      // Refrescar cola
      const data = await api.get(`/orders/station/${activeStation.name}/queue`);
      setQueue(data);
      setSelected(data.length > 0 ? data[0] : null);
      setChecked([]);
      fetchCounts();
    } catch (err) {
      alert(err.message || 'Error al procesar la orden');
    } finally {
      setActing(false);
    }
  }

  // ── RENDER: Pantalla selector ──────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg, fontFamily: font,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: T.surface, borderBottom: `1px solid ${T.border}`,
          padding: '16px 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>
              Print<span style={{ color: T.accent }}>OS</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: T.textMid, marginLeft: 12 }}>
                · Interfaz de Estación
              </span>
            </div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
              {user?.name} · {user?.role}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
                background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font,
              }}
            >
              ← Dashboard
            </button>
            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              style={{
                padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
                background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font,
              }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Grid de estaciones */}
        <div style={{ flex: 1, padding: '32px 28px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textMid, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Selecciona tu estación de trabajo
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}>
            {STATIONS.map(st => {
              const count = counts[st.name] ?? 0;
              return (
                <div
                  key={st.name}
                  onClick={() => enterStation(st)}
                  style={{
                    background: T.surface, border: `2px solid ${count > 0 ? st.color + '44' : T.border}`,
                    borderRadius: 20, padding: '24px 22px', cursor: 'pointer',
                    transition: 'transform 0.12s, box-shadow 0.12s',
                    boxShadow: T.shadow,
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = T.shadowMd; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = T.shadow; }}
                >
                  {/* Badge de conteo */}
                  {count > 0 && (
                    <div style={{
                      position: 'absolute', top: 16, right: 16,
                      background: st.color, color: '#fff',
                      borderRadius: '50%', width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800,
                    }}>
                      {count}
                    </div>
                  )}
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{st.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>
                    {st.label}
                  </div>
                  <div style={{ fontSize: 12, color: T.textLight, lineHeight: 1.5 }}>
                    {st.description}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: count > 0 ? st.color : T.textLight }}>
                    {count > 0 ? `${count} orden${count > 1 ? 'es' : ''} en progreso` : 'Sin órdenes activas'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Modo trabajo ───────────────────────────────────────────────────
  const pLabel = selected ? priorityLabel(selected.priority) : null;

  return (
    <div style={{
      height: '100vh', background: T.bg, fontFamily: font,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Topbar estación */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        gap: 14, flexShrink: 0,
      }}>
        <button
          onClick={exitStation}
          style={{
            padding: '7px 14px', borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font,
          }}
        >
          ← Estaciones
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '7px 14px', borderRadius: 10, border: `1px solid ${T.border}`,
            background: T.surface2, color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font,
          }}
        >
          Dashboard
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flex: 1,
        }}>
          <span style={{ fontSize: 22 }}>{activeStation.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
              Estación: {activeStation.label}
            </div>
            <div style={{ fontSize: 11, color: T.textLight }}>{activeStation.description}</div>
          </div>
        </div>
        <div style={{
          padding: '5px 14px', borderRadius: 20,
          background: activeStation.lightBg, color: activeStation.color,
          fontSize: 12, fontWeight: 700,
        }}>
          {queue.length} en cola
        </div>
        <div style={{ fontSize: 12, color: T.textLight }}>{user?.name}</div>
      </div>

      {/* Body: cola izq + panel der */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Cola de órdenes */}
        <div style={{
          width: 300, borderRight: `1px solid ${T.border}`,
          background: T.surface, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Cola de trabajo
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {loadingQ ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.textLight, fontSize: 13 }}>Cargando...</div>
            ) : queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: T.textLight, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
                No hay órdenes pendientes
              </div>
            ) : queue.map((o) => {
              const pl = priorityLabel(o.priority);
              const isActive = selected?.id === o.id;
              return (
                <div
                  key={o.id}
                  onClick={() => selectOrder(o)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, marginBottom: 6,
                    cursor: 'pointer', border: `2px solid ${isActive ? activeStation.color : T.borderLight}`,
                    background: isActive ? activeStation.lightBg : T.surface2,
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{o.code}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 20, background: pl.bg, color: pl.color,
                    }}>
                      {pl.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMid, marginBottom: 4 }}>
                    {o.client_name || 'Cliente sin nombre'}
                  </div>
                  <div style={{ fontSize: 11, color: T.textLight }}>
                    Tiempo en estación: <strong style={{ color: T.textMid }}>{elapsed(o.started_at)}</strong>
                  </div>
                  {o.due_date && (
                    <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>
                      Entrega: {new Date(o.due_date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de trabajo */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textLight, fontSize: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{activeStation.icon}</div>
                <div>Selecciona una orden de la cola para trabajar</div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', gap: 20 }}>

              {/* Detalle de la orden */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Encabezado orden */}
                <div style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 16, padding: 20, marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>
                        {selected.code}
                      </div>
                      <div style={{ fontSize: 13, color: T.textMid, marginTop: 2 }}>
                        {selected.client_name || 'Cliente sin nombre'}
                        {selected.client_phone && <span style={{ color: T.textLight }}> · {selected.client_phone}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '4px 12px',
                        borderRadius: 20, background: pLabel.bg, color: pLabel.color,
                      }}>
                        {pLabel.label}
                      </span>
                      <div style={{ fontSize: 11, color: T.textLight, marginTop: 6 }}>
                        En esta estación: <strong>{elapsed(selected.started_at)}</strong>
                      </div>
                    </div>
                  </div>

                  {selected.due_date && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 10,
                      background: T.yellowLight, color: T.yellow,
                      fontSize: 12, fontWeight: 600,
                    }}>
                      📅 Entrega: {new Date(selected.due_date).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  )}

                  {selected.notes && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 10,
                      background: T.yellowLight, border: `1px solid ${T.yellow}44`,
                      fontSize: 12, color: T.text, lineHeight: 1.5,
                    }}>
                      <strong>📝 Notas:</strong> {selected.notes}
                    </div>
                  )}
                </div>

                {/* Items del trabajo */}
                {selected.items && selected.items.length > 0 && (
                  <div style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 16, padding: 20,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>
                      📋 Especificaciones del trabajo
                    </div>
                    {selected.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '14px 16px', borderRadius: 12,
                          background: T.surface2, marginBottom: i < selected.items.length - 1 ? 10 : 0,
                          border: `1px solid ${T.borderLight}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div>
                            <span style={{
                              fontSize: 12, fontWeight: 700, padding: '2px 10px',
                              borderRadius: 20, background: T.accentLight, color: T.accentDark,
                              marginRight: 8,
                            }}>
                              ×{item.quantity}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                              {item.material_name}
                            </span>
                          </div>
                          <span style={{ fontSize: 12, color: T.textMid, fontWeight: 600 }}>
                            {item.process_name}
                          </span>
                        </div>
                        {item.width_cm && item.height_cm && (
                          <div style={{ fontSize: 12, color: T.textMid, marginBottom: 4 }}>
                            📐 {item.width_cm} × {item.height_cm} cm
                            {item.area_m2 && <span style={{ color: T.textLight }}> ({item.area_m2.toFixed(2)} m²)</span>}
                          </div>
                        )}
                        {item.finishings && item.finishings.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                            {item.finishings.map((f, j) => (
                              <span key={j} style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 9px',
                                borderRadius: 20, background: T.peachLight, color: T.peach,
                              }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel checklist */}
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{
                  background: T.surface, border: `2px solid ${allChecked ? activeStation.color : T.border}`,
                  borderRadius: 16, padding: 20, position: 'sticky', top: 0,
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                    Lista de verificación
                  </div>
                  <div style={{ fontSize: 11, color: T.textLight, marginBottom: 18 }}>
                    Marca todos los puntos antes de avanzar
                  </div>

                  {activeStation.checklist.map((item, i) => {
                    const done = checked.includes(i);
                    return (
                      <div
                        key={i}
                        onClick={() => toggleCheck(i)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '11px 14px', borderRadius: 12, marginBottom: 8,
                          cursor: 'pointer',
                          background: done ? activeStation.lightBg : T.surface2,
                          border: `1px solid ${done ? activeStation.color + '55' : T.borderLight}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 0,
                          border: `2px solid ${done ? activeStation.color : T.border}`,
                          background: done ? activeStation.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {done && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{
                          fontSize: 13, lineHeight: 1.45,
                          color: done ? activeStation.color : T.textMid,
                          fontWeight: done ? 600 : 400,
                          textDecoration: done ? 'none' : 'none',
                          transition: 'color 0.15s',
                        }}>
                          {item}
                        </div>
                      </div>
                    );
                  })}

                  {/* Progreso */}
                  <div style={{ margin: '16px 0 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textLight, marginBottom: 6 }}>
                      <span>Progreso</span>
                      <span style={{ fontWeight: 700, color: allChecked ? activeStation.color : T.textMid }}>
                        {checked.length}/{activeStation.checklist.length}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: T.borderLight, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        background: activeStation.color,
                        width: `${(checked.length / activeStation.checklist.length) * 100}%`,
                        transition: 'width 0.25s',
                      }} />
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <button
                    disabled={!allChecked || acting}
                    onClick={handleAction}
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                      background: allChecked ? activeStation.color : T.borderLight,
                      color: allChecked ? '#fff' : T.textLight,
                      fontSize: 14, fontWeight: 800, cursor: allChecked ? 'pointer' : 'not-allowed',
                      fontFamily: font, transition: 'all 0.2s',
                      opacity: acting ? 0.7 : 1,
                    }}
                  >
                    {acting ? 'Procesando...' : allChecked
                      ? `✓ ${activeStation.actionLabel}`
                      : `Completa los ${activeStation.checklist.length - checked.length} puntos restantes`}
                  </button>

                  {activeStation.action === 'deliver' && (
                    <div style={{
                      marginTop: 10, padding: '8px 12px', borderRadius: 10,
                      background: T.peachLight, border: `1px solid ${T.danger}33`,
                      fontSize: 11, color: T.danger, lineHeight: 1.5, textAlign: 'center',
                    }}>
                      ⚠️ Esta acción marca la orden como <strong>ENTREGADA</strong>. Es irreversible.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
