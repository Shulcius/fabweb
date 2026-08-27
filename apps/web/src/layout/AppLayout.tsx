import type { ReactNode } from 'react';
import { APP_VERSION } from '@fabweb/shared';
import type { AppView, AuthUser } from '../lib/api';
import { MICRO_ROLE_LABELS, ROLE_LABELS } from '../lib/labels';
import './AppLayout.css';

interface NavItem {
  id: AppView;
  label: string;
  icon: string;
  roles?: string[];
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: '⌂' },
  { id: 'projects', label: 'Проекты КБ', icon: '◫', roles: ['admin', 'worker', 'supervisor'] },
  { id: 'workorders', label: 'Очередь 3D', icon: '☰', roles: ['admin', 'worker', 'supervisor'] },
  { id: 'machines', label: 'Станки', icon: '⬡', roles: ['admin', 'worker', 'supervisor'] },
  { id: 'showcase', label: 'Витрина', icon: '★' },
  { id: 'users', label: 'Пользователи', icon: '👤', roles: ['admin', 'supervisor'] },
];

interface Props {
  user: AuthUser;
  view: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function AppLayout({ user, view, onNavigate, onLogout, children }: Props) {
  const navItems = NAV.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">fabweb</span>
          <span className="sidebar__tag">v{APP_VERSION}</span>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-item__icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{user.full_name.charAt(0)}</div>
            <div>
              <div className="sidebar__name">{user.full_name}</div>
              <div className="sidebar__role">{ROLE_LABELS[user.role] ?? user.role}</div>
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar__title">
            {navItems.find((n) => n.id === view)?.label ?? 'fabweb'}
          </h1>
          {user.micro_roles.length > 0 && (
            <div className="topbar__tags">
              {user.micro_roles.map((r) => (
                <span key={r} className="tag">
                  {MICRO_ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          )}
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
