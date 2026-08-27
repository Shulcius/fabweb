import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '../lib/api';
import { api } from '../lib/api';
import { formatMicroRoles, ROLE_LABELS } from '../lib/labels';

export function UsersPage({ token }: { token: string }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<AuthUser[]>('/api/v1/users', {}, token);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-section">
      <div className="page-section__header">
        <p className="page-section__desc">Управление доступом и ролями (RBAC)</p>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          Обновить
        </button>
      </div>
      {error && <p className="page-error">{error}</p>}
      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Эл. почта</th>
                <th>Роль</th>
                <th>Микророли</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge">{ROLE_LABELS[u.role] ?? u.role}</span>
                  </td>
                  <td>{formatMicroRoles(u.micro_roles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
