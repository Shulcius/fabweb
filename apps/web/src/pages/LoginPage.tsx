import { useState } from 'react';
import type { AuthUser } from '../lib/api';
import { api } from '../lib/api';
import './LoginPage.css';

const DEMO_USERS = [
  { email: 'admin@fab.local', password: 'admin123', label: 'Админ', role: 'admin' },
  { email: 'worker@fab.local', password: 'worker123', label: 'Работник', role: 'worker' },
  { email: 'supervisor@fab.local', password: 'supervisor123', label: 'Научрук', role: 'supervisor' },
  { email: 'guest@fab.local', password: 'guest123', label: 'Гость', role: 'guest' },
];

interface Props {
  onLogin: (token: string, user: AuthUser) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{ access_token: string; user: AuthUser }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.access_token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  }

  return (
    <div className="login-page">
      <div className="login-page__bg" />
      <div className="login-page__content">
        <aside className="login-page__brand">
          <div className="login-page__logo">fabweb</div>
          <h1>Мини-фабрика и конструкторское бюро</h1>
          <p>
            Управление проектами, производством 3D и научными публикациями — в единой системе.
          </p>
          <ul className="login-page__features">
            <li>Проекты КБ и ветки разработки</li>
            <li>Роли: инженер, электронщик, программист</li>
            <li>Приоритет локальной работы (offline-first)</li>
          </ul>
        </aside>

        <section className="login-page__form-panel">
          <h2>Вход в систему</h2>
          <p className="login-page__hint">Используйте корпоративную эл. почту и пароль</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Эл. почта
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="name@fab.local"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Пароль
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="login-page__error">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Вход…' : 'Войти'}
            </button>
          </form>

          <div className="login-page__demo">
            <span>Демо-доступ:</span>
            <div className="login-page__demo-buttons">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="btn btn-demo"
                  onClick={() => fillDemo(u.email, u.password)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
