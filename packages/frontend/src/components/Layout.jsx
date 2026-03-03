import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { LIGHT, DARK, font } from '../lib/theme';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '○', label: 'Dashboard',      roles: ['admin','atencion','cajera','operario','disenador'] },
  { to: '/quotes',    icon: '◇', label: 'Presupuestos',   roles: ['admin','atencion'] },
  { to: '/orders',    icon: '▷', label: 'Órdenes',        roles: ['admin','atencion','cajera','operario','disenador'] },
  { to: '/clients',   icon: '◎', label: 'Clientes',       roles: ['admin','atencion'] },
  { to: '/settings',  icon: '◌', label: 'Configuración',  roles: ['admin'] },
];

const PAGE_TITLES = {
  '/dashboard': (name) => `Buenos días, ${name} 👋`,
  '/quotes':    () => 'Presupuestos',
  '/orders':    () => 'Órdenes de Trabajo',
  '/clients':   () => 'Clientes',
  '/settings':  () => 'Configuración',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const T = dark ? DARK : LIGHT;
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));
  const firstName = user?.name?.split(' ')[0] || '';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const titleFn = Object.entries(PAGE_TITLES).find(([path]) => location.pathname.startsWith(path))?.[1];
  const title = titleFn ? titleFn(firstName) : 'PrintOS';

  const btnG = {
    padding: '8px 14px', borderRadius: 10,
    border: `1px solid ${T.border}`, background: T.surface2,
    color: T.textMid, fontSize: 13, cursor: 'pointer', fontFamily: font,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: font, color: T.text, overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 200, background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 18px', borderBottom: `1px solid ${T.borderLight}` }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>
            Print<span style={{ color: T.accent }}>OS</span>
          </div>
          <div style={{ fontSize: 11, color: T.textLight, marginTop: 3 }}>Gestión de impresión</div>
        </div>

        <div style={{ padding: '12px 10px', flex: 1 }}>
          {visibleNav.map(item => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <div
                key={item.to}
                onClick={() => navigate(item.to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, marginBottom: 2,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? T.accentDark : T.textMid,
                  background: isActive ? T.accentLight : 'transparent',
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${T.borderLight}`, background: T.surface2 }}>
          <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>Tasa BCV hoy</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.accent }}>€1 = Bs 48.20</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: 58, background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={toggle} style={{ ...btnG, fontSize: 12, padding: '6px 16px', borderRadius: 20 }}>
              {dark ? '☀ Claro' : '☾ Oscuro'}
            </button>
            <div title={user?.name} style={{ width: 34, height: 34, borderRadius: '50%', background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.accentDark, cursor: 'default' }}>
              {initials}
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} style={btnG}>
              Salir
            </button>
          </div>
        </div>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
