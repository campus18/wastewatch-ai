import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation, Link } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import type { Role } from './types';
import { Spinner } from './ui';
import AnalyticsPage from './pages/AnalyticsPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import MapPage from './pages/MapPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportNew from './pages/ReportNew';
import ReportsPage from './pages/ReportsPage';
import RoutesPage from './pages/RoutesPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';

const ICONS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  task: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM8 17h6a4 4 0 000-8h-4a3 3 0 010-6h4',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};
const Icon = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICONS[name]} /></svg>;

interface NavItem { to: string; label: string; icon: string; roles: Role[] }
const ALL: Role[] = ['admin', 'supervisor', 'collector', 'citizen'];
const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'home', roles: ALL },
  { to: '/report/new', label: 'Report waste', icon: 'plus', roles: ALL },
  { to: '/reports', label: 'Reports', icon: 'list', roles: ['admin', 'supervisor', 'collector', 'citizen'] },
  { to: '/map', label: 'Hotspot map', icon: 'map', roles: ALL },
  { to: '/tasks', label: 'Tasks', icon: 'task', roles: ['admin', 'supervisor', 'collector'] },
  { to: '/routes', label: 'Routes', icon: 'route', roles: ['admin', 'supervisor', 'collector'] },
  { to: '/analytics', label: 'Analytics', icon: 'chart', roles: ['admin', 'supervisor'] },
  { to: '/notifications', label: 'Notifications', icon: 'bell', roles: ALL },
  { to: '/users', label: 'Users', icon: 'users', roles: ['admin'] },
];

function useUnread() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => api<{ unread: number }>('/notifications').then((r) => alive && setN(r.unread)).catch(() => undefined);
    load();
    const t = setInterval(load, 30000);
    window.addEventListener('ww:notifications', load);
    return () => { alive = false; clearInterval(t); window.removeEventListener('ww:notifications', load); };
  }, []);
  return n;
}

function Layout() {
  const { user, logout } = useAuth();
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const unread = useUnread();
  useEffect(() => setMore(false), [loc.pathname]);
  if (!user) return null;
  // Role-specific ordering so each role's most-used screens land in the 4 bottom-bar slots.
  const first: Record<Role, string[]> = { collector: ['/', '/tasks', '/routes', '/map'], supervisor: ['/', '/reports', '/map', '/tasks'], admin: ['/', '/reports', '/map', '/tasks'], citizen: ['/', '/report/new', '/reports', '/map'] };
  const rank = (to: string) => { const i = first[user.role].indexOf(to); return i === -1 ? 99 : i; };
  const items = NAV.filter((i) => i.roles.includes(user.role)).sort((a, b) => rank(a.to) - rank(b.to));
  const primary = items.slice(0, 4);
  const link = (i: NavItem) => (
    <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
      <Icon name={i.icon} /><span>{i.label}</span>{i.to === '/notifications' && unread > 0 && <b className="count">{unread}</b>}
    </NavLink>
  );
  return (
    <div className="shell">
      <aside className="side"><div className="brand">WasteWatch<span> AI</span></div><nav aria-label="Main">{items.map(link)}</nav></aside>
      <div className="main">
        <header className="top">
          <div className="brand sm">WasteWatch<span> AI</span></div>
          <div className="grow" />
          <Link to="/notifications" className="bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Icon name="bell" />{unread > 0 && <b className="count">{unread}</b>}</Link>
          <div className="who"><strong>{user.name}</strong><span>{user.role}</span></div>
          <button className="btn sm ghost" onClick={logout}>Sign out</button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
      <nav className="bottom" aria-label="Main">
        {primary.map(link)}
        {items.length > 4 && <button className={more ? 'on' : ''} onClick={() => setMore((m) => !m)} aria-expanded={more}><Icon name="more" /><span>More</span></button>}
      </nav>
      {more && <div className="sheet" role="menu">{items.slice(4).map(link)}</div>}
    </div>
  );
}

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) return <div className="state empty"><strong>Not available for your role</strong><span>Ask an administrator if you need access.</span><Link className="btn" to="/">Back to dashboard</Link></div>;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner text="Signing you in…" />;
  if (!user) return <Login />;
  const g = (path: string, roles: Role[], el: ReactNode) => <Route path={path} element={<Guard roles={roles}>{el}</Guard>} />;
  return (
    <Routes>
      <Route element={<Layout />}>
        {g('/', ALL, <Dashboard />)}
        {g('/report/new', ALL, <ReportNew />)}
        {g('/reports', ALL, <ReportsPage />)}
        {g('/map', ALL, <MapPage />)}
        {g('/tasks', ['admin', 'supervisor', 'collector'], <TasksPage />)}
        {g('/routes', ['admin', 'supervisor', 'collector'], <RoutesPage />)}
        {g('/analytics', ['admin', 'supervisor'], <AnalyticsPage />)}
        {g('/notifications', ALL, <NotificationsPage />)}
        {g('/users', ['admin'], <UsersPage />)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
