import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font } from '../lib/theme';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { dark } = useThemeStore();
  const T = dark ? DARK : LIGHT;

  const card = (x = {}) => ({
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 16, padding: 20, ...x,
  });

  const stats = [
    { label: 'Cobrado hoy',          value: '€ —', sub: 'sin datos aún',            color: T.accent, bg: T.accentLight },
    { label: 'En proceso',           value: '—',   sub: 'órdenes activas',           color: T.blue,   bg: T.blueLight },
    { label: 'Listos p/ entregar',   value: '—',   sub: 'sin órdenes listas',        color: T.peach,  bg: T.peachLight },
    { label: 'Pendientes de cobro',  value: '€ —', sub: 'presupuestos aprobados',    color: T.yellow, bg: T.yellowLight },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 14, padding: 18, border: `1px solid ${s.color}44` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: T.textMid, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div style={card()}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 20 }}>Presupuestos recientes</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, color: T.textLight, fontSize: 13, gap: 8 }}>
            <span style={{ fontSize: 24, opacity: 0.4 }}>◇</span>
            Los presupuestos aparecerán aquí
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 20 }}>Producción</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, color: T.textLight, fontSize: 13, gap: 8 }}>
            <span style={{ fontSize: 24, opacity: 0.4 }}>▷</span>
            Las órdenes aparecerán aquí
          </div>
        </div>
      </div>
    </div>
  );
}
