import { useCallback, useEffect, useState } from 'react';
import type { UserRole } from '@fabweb/shared';
import { api } from '../lib/api';
import type { ProjectDetail } from '../lib/projects';
import { PROJECT_TYPE_LABELS } from '../lib/projects';
import './ProjectsListPage.css';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending_review: 'На проверке',
  active: 'Активен',
  completed: 'Завершён',
  archived: 'Архив',
};

interface Props {
  token: string;
  role: UserRole;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onError: (msg: string) => void;
}

export function ProjectsPage({ token, role, onCreate, onOpen, onError }: Props) {
  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const canCreate = role !== 'guest';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<ProjectDetail[]>('/api/v1/projects', {}, token);
      setProjects(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="projects-list-page">
      <div className="page-section__header">
        <p className="page-section__desc">
          {role === 'guest'
            ? 'Опубликованные работы конструкторского бюро'
            : 'Все проекты с описанием, файлами и статусами'}
        </p>
        <div className="header-btns">
          <button type="button" className="btn" onClick={load} disabled={loading}>
            Обновить
          </button>
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              + Новый проект
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <p>Проектов пока нет</p>
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={onCreate}>
              Создать первый проект
            </button>
          )}
        </div>
      ) : (
        <div className="projects-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Файлы</th>
                <th>Автор</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="project-row" onClick={() => onOpen(p.id)}>
                  <td>
                    <strong>{p.title}</strong>
                    <div className="muted row-summary">{p.summary}</div>
                  </td>
                  <td>{PROJECT_TYPE_LABELS[p.type]}</td>
                  <td>
                    <span className={`badge badge-${p.status}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td>{p.assets?.length ?? 0}</td>
                  <td>{p.owner.full_name}</td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(p.id);
                      }}
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
