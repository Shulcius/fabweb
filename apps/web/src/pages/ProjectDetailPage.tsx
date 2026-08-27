import { useCallback, useEffect, useState } from 'react';
import type { UserRole } from '@fabweb/shared';
import { api } from '../lib/api';
import { MICRO_ROLE_LABELS } from '../lib/labels';
import type { ProjectDetail } from '../lib/projects';
import {
  ASSET_KIND_LABELS,
  PROJECT_TYPE_LABELS,
  assetFileUrl,
  fetchAssetBlob,
  uploadProjectAsset,
  type AssetKind,
  type PendingUpload,
} from '../lib/projects';
import './ProjectDetailPage.css';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending_review: 'На проверке',
  active: 'Активен',
  completed: 'Завершён',
  archived: 'Архив',
};

interface Props {
  token: string;
  projectId: string;
  role: UserRole;
  onBack: () => void;
  onError: (msg: string) => void;
}

function AssetThumb({
  token,
  projectId,
  assetId,
  mime,
}: {
  token: string;
  projectId: string;
  assetId: string;
  mime: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mime.startsWith('image/')) return;
    let cancelled = false;
    fetchAssetBlob(token, projectId, assetId).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, projectId, assetId, mime]);

  if (!mime.startsWith('image/')) {
    return <div className="asset-thumb asset-thumb--file">Файл</div>;
  }
  if (!url) return <div className="asset-thumb asset-thumb--loading" />;
  return <img src={url} alt="" className="asset-thumb" />;
}

export function ProjectDetailPage({ token, projectId, role, onBack, onError }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadKind, setUploadKind] = useState<AssetKind>('photo');

  const canEdit = role !== 'guest' && project?.status === 'draft';
  const canReview = role === 'admin' || role === 'supervisor';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<ProjectDetail>(`/api/v1/projects/${projectId}`, {}, token);
      setProject(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [projectId, token, onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(path: string) {
    try {
      await api(`/api/v1/projects/${projectId}/${path}`, { method: 'POST', body: '{}' }, token);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !project) return;
    try {
      for (const file of Array.from(files)) {
        const upload: PendingUpload = {
          id: crypto.randomUUID(),
          file,
          kind: uploadKind,
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          is_cover: uploadKind === 'photo' && !project.assets.some((a) => a.is_cover),
        };
        await uploadProjectAsset(token, project.id, upload);
      }
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
  }

  async function removeAsset(assetId: string) {
    try {
      await api(`/api/v1/projects/${projectId}/assets/${assetId}`, { method: 'DELETE' }, token);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  }

  if (loading || !project) {
    return <p className="muted">Загрузка проекта…</p>;
  }

  const settings = (project.settings ?? {}) as Record<string, unknown>;

  return (
    <div className="project-detail">
      <button type="button" className="btn back-btn" onClick={onBack}>
        ← К списку
      </button>

      <header className="detail-header card">
        <div>
          <div className="detail-header__meta">
            <span className={`status-pill status-${project.status}`}>
              {STATUS_LABELS[project.status]}
            </span>
            <span className="muted">{PROJECT_TYPE_LABELS[project.type]}</span>
          </div>
          <h2>{project.title}</h2>
          <p className="detail-summary">{project.summary}</p>
          <p className="muted">
            {project.owner.full_name} · {new Date(project.updated_at).toLocaleDateString('ru-RU')}
          </p>
          {project.tags.length > 0 && (
            <div className="tag-row">
              {project.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="detail-actions">
          {project.status === 'draft' && canEdit && (
            <button type="button" className="btn btn-primary" onClick={() => action('submit')}>
              На проверку
            </button>
          )}
          {canReview && (project.status === 'draft' || project.status === 'pending_review') && (
            <>
              <button type="button" className="btn btn-primary" onClick={() => action('approve')}>
                Одобрить
              </button>
              {project.status === 'pending_review' && (
                <button type="button" className="btn" onClick={() => action('reject')}>Вернуть</button>
              )}
            </>
          )}
          {project.status === 'active' && canEdit && (
            <button type="button" className="btn" onClick={() => action('complete')}>Завершить</button>
          )}
          {project.status === 'completed' && !project.showcase_published && canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await api(
                    `/api/v1/projects/${projectId}/showcase`,
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        published: true,
                        public_description: project.summary,
                      }),
                    },
                    token,
                  );
                  await load();
                } catch (e) {
                  onError(e instanceof Error ? e.message : 'Ошибка');
                }
              }}
            >
              В витрину
            </button>
          )}
        </div>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h3>Описание</h3>
          <p className="detail-text">{project.description}</p>
          {project.goals && (
            <>
              <h4>Цели</h4>
              <p className="detail-text">{project.goals}</p>
            </>
          )}
        </section>

        <section className="card">
          <h3>Настройки</h3>
          <dl className="settings-dl">
            <dt>Назначение</dt>
            <dd>{String(settings.intended_use || '—')}</dd>
            <dt>Дисциплины</dt>
            <dd>
              {Array.isArray(settings.disciplines)
                ? (settings.disciplines as string[])
                    .map((d) => MICRO_ROLE_LABELS[d] ?? d)
                    .join(', ') || '—'
                : '—'}
            </dd>
            <dt>3D-печать</dt>
            <dd>{settings.needs_3d_print ? 'Да' : 'Нет'}</dd>
            <dt>Платформа</dt>
            <dd>{String(settings.target_platform || '—')}</dd>
            <dt>Материалы</dt>
            <dd>{String(settings.material_notes || '—')}</dd>
          </dl>
        </section>
      </div>

      <section className="card">
        <div className="assets-header">
          <h3>Файлы и материалы ({project.assets.length})</h3>
          {canEdit && (
            <div className="upload-bar">
              <select value={uploadKind} onChange={(e) => setUploadKind(e.target.value as AssetKind)}>
                {Object.entries(ASSET_KIND_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
              <label className="btn btn-primary upload-btn">
                Добавить
                <input type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
              </label>
            </div>
          )}
        </div>

        {project.assets.length === 0 ? (
          <p className="muted">Файлы не загружены</p>
        ) : (
          <div className="assets-grid">
            {project.assets.map((asset) => (
              <article key={asset.id} className="asset-card">
                <AssetThumb
                  token={token}
                  projectId={project.id}
                  assetId={asset.id}
                  mime={asset.mime_type}
                />
                <div className="asset-card__body">
                  <strong>{asset.title}</strong>
                  <span className="muted">{ASSET_KIND_LABELS[asset.kind]}</span>
                  <span className="muted">{asset.filename}</span>
                  {asset.is_cover && <span className="badge">Обложка</span>}
                  <div className="asset-card__actions">
                    <a
                      className="btn"
                      href={assetFileUrl(project.id, asset.id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        fetchAssetBlob(token, project.id, asset.id).then((url) => {
                          window.open(url, '_blank');
                        });
                      }}
                    >
                      Открыть
                    </a>
                    {canEdit && (
                      <button type="button" className="btn" onClick={() => removeAsset(asset.id)}>
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
