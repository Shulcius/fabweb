import { useCallback, useEffect, useState } from 'react';
import type { AppView, AuthUser } from './lib/api';
import { TOKEN_KEY, api } from './lib/api';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectCreatePage } from './pages/ProjectCreatePage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { MachinesPage } from './pages/MachinesPage';
import { UsersPage } from './pages/UsersPage';
import { ShowcasePage } from './pages/ShowcasePage';
import './App.css';

function defaultView(role: AuthUser['role']): AppView {
  return role === 'guest' ? 'showcase' : 'dashboard';
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<AppView>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [booting, setBooting] = useState(!!token);

  const layoutView: AppView =
    view === 'project-create' || view === 'project-detail' ? 'projects' : view;

  const loadMe = useCallback(async (authToken: string) => {
    const me = await api<AuthUser>('/api/v1/auth/me', {}, authToken);
    setUser(me);
    setView(defaultView(me.role));
  }, []);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }
    loadMe(token)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, [token, loadMe]);

  function handleLogin(authToken: string, authUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, authToken);
    setToken(authToken);
    setUser(authUser);
    setView(defaultView(authUser.role));
    setError('');
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    setSelectedProjectId(null);
    setError('');
  }

  async function giveConsent() {
    if (!token || !user) return;
    const updated = await api<AuthUser>(
      '/api/v1/auth/consent',
      { method: 'POST', body: JSON.stringify({ accepted: true }) },
      token,
    );
    setUser(updated);
  }

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-screen__spinner" />
        <p>Загрузка fabweb…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AppLayout user={user} view={layoutView} onNavigate={setView} onLogout={logout}>
      {error && (
        <div className="toast-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>×</button>
        </div>
      )}

      {!user.pd_consent_at && user.role !== 'guest' && (
        <div className="consent-banner">
          <span>152-ФЗ: необходимо согласие на обработку персональных данных</span>
          <button type="button" className="btn btn-primary" onClick={giveConsent}>
            Принимаю
          </button>
        </div>
      )}

      {view === 'dashboard' && <DashboardPage user={user} />}
      {view === 'projects' && (
        <ProjectsPage
          token={token}
          role={user.role}
          onCreate={() => setView('project-create')}
          onOpen={(id) => {
            setSelectedProjectId(id);
            setView('project-detail');
          }}
          onError={setError}
        />
      )}
      {view === 'project-create' && (
        <ProjectCreatePage
          token={token}
          onCancel={() => setView('projects')}
          onCreated={(id) => {
            setSelectedProjectId(id);
            setView('project-detail');
          }}
          onError={setError}
        />
      )}
      {view === 'project-detail' && selectedProjectId && (
        <ProjectDetailPage
          token={token}
          projectId={selectedProjectId}
          role={user.role}
          onBack={() => setView('projects')}
          onError={setError}
        />
      )}
      {view === 'users' && <UsersPage token={token} />}
      {view === 'workorders' && (
        <WorkOrdersPage
          token={token}
          role={user.role}
          userId={user.id}
          onError={setError}
        />
      )}
      {view === 'machines' && (
        <MachinesPage token={token} role={user.role} onError={setError} />
      )}
      {view === 'showcase' && <ShowcasePage />}
    </AppLayout>
  );
}
