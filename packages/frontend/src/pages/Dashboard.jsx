import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font, avatarColors } from '../lib/theme';
import { api } from '../lib/api';

const STATUS_CONFIG = {
  draft:    { label: 'Borrador',  bg: null,          color: null },
  sent:     { label: 'Enviado',   bg: 'blueLight',   color: 'blue' },
  approved: { label: 'Aprobado',  bg: 'accentLight', color: 'accentDark' },
  rejected: { label: 'Rechazado', bg: 'peachLight',  color: 'danger' },
  expired:  { label: 'Expirado',  bg: null,          color: null },
};

const STATION_LABELS = {
  recepcion: 'Recepción', diseno: 'Diseño', impresion: 'Impresión',
  acabados: 'Acabados', control_calidad: 'Control Calidad', retiro: 'Retiro',
};

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function Dashboard() {
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;
  const navigate = useNavigate();

  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const card = (x = {}) => ({ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, ...x });

  const badge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return {
      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
      background: cfg.bg ? T[cfg.bg] : T.surface2,
      color: cfg.color ? T[cfg.color] : T.textLight,
    };
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.textLight, fontSize: 13, fontFamily: font }}>
      Cargando...
    </div>
  );

  const stats = [
    {
      label: 'Cobrado hoy',
      value: `Bs ${(data?.cobrado_hoy || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`,
      sub: 'pagos registrados hoy',
      color: T.accent, bg: T.accentLight,
    },
    {
      label: 'En proceso',
      value: String(data?.en_proceso ?? '—'),
      sub: 'órdenes activas',
      color: T.blue, bg: T.blueLight,
    },
    {
      label: 'Listos p/ entregar',
      value: String(data?.listos_entregar ?? '—'),
      sub: data?.listos_info || 'sin órdenes listas',
      color: T.peach, bg: T.peachLight,
    },
    {
      label: 'Pendientes de cobro',
      value: `${data?.pendientes_currency || 'USD'} ${(data?.pendientes_cobro || 0).toFixed(2)}`,
      sub: 'presupuestos aprobados',
      color: T.yellow, bg: T.yellowLight,
    },
  ];

  return (
    <div style={{ fontFamily: font }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 14, padding: 18, border: `1px solid ${s.color}44` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px', marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{s.label}</div>
            <div style={{ fontSize: 11, color: T.textMid, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tablas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>

        {/* Presupuestos recientes */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Presupuestos recientes</div>
            <span onClick={() => navigate('/quotes')} style={{ fontSize: 12, color: T.accent, cursor: 'pointer', fontWeight: 600 }}>Ver todos →</span>
          </div>

          {!data?.presupuestos_recientes?.length ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>
              <div style={{ fontSize: 24, opacity: 0.4, marginBottom: 8 }}>◇</div>
              Sin presupuestos aún
            </div>
          ) : data.presupuestos_recientes.map((p, i, arr) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#2d2d2d', flexShrink: 0 }}>
                {initials(p.client_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client_name || 'Sin cliente'}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{p.code}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.currency} {parseFloat(p.subtotal).toFixed(2)}</div>
                <span style={badge(p.status)}>{STATUS_CONFIG[p.status]?.label || p.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Producción */}
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Producción</div>
            <span onClick={() => navigate('/orders')} style={{ fontSize: 12, color: T.accent, cursor: 'pointer', fontWeight: 600 }}>Ver todas →</span>
          </div>

          {!data?.ordenes_recientes?.length ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>
              <div style={{ fontSize: 24, opacity: 0.4, marginBottom: 8 }}>▷</div>
              Sin órdenes activas
            </div>
          ) : data.ordenes_recientes.map((o, i) => {
            const progress = o.total_stations > 0 ? Math.round((o.done_stations / o.total_stations) * 100) : 0;
            const orderStatus = o.status === 'completed' ? 'listo' : 'en_proceso';
            return (
              <div key={o.id} style={{ background: T.surface2, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.borderLight}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{o.code}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: o.status === 'completed' ? T.accentLight : T.yellowLight, color: o.status === 'completed' ? T.accentDark : T.yellow }}>
                    {o.status === 'completed' ? 'Listo' : 'En proceso'}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{o.client_name || 'Sin cliente'}</div>
                {o.current_station && (
                  <div style={{ fontSize: 11, color: T.textMid, marginBottom: 8 }}>
                    {STATION_LABELS[o.current_station] || o.current_station}
                  </div>
                )}
                <div style={{ height: 5, background: T.borderLight, borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? T.success : T.accent, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
