import { useCallback, useEffect, useState } from 'react';
import type { ProjectType } from '@fabweb/shared';
import { api } from '../lib/api';
import { PROJECT_TYPE_LABELS } from '../lib/projects';

interface ShowcaseItem {
  id: string;
  title: string;
  showcase_description: string;
  showcase_photos: string[];
  type: ProjectType;
  owner: { full_name: string };
  updated_at: string;
}

export function ShowcasePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<ShowcaseItem[]>('/api/v1/showcase');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-section">
      <div className="page-section__header">
        <p className="page-section__desc">Публичные завершённые работы конструкторского бюро</p>
        <button type="button" className="btn" onClick={load}>
          Обновить
        </button>
      </div>
      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>В витрине пока нет опубликованных проектов</p>
        </div>
      ) : (
        <div className="showcase-grid">
          {items.map((item) => (
            <article key={item.id} className="showcase-card">
              <div className="showcase-card__thumb">
                {item.showcase_photos[0] ? (
                  <img src={item.showcase_photos[0]} alt="" />
                ) : (
                  <span>{PROJECT_TYPE_LABELS[item.type] ?? item.type}</span>
                )}
              </div>
              <h3>{item.title}</h3>
              <p>{item.showcase_description || 'Без описания'}</p>
              <footer>{item.owner.full_name}</footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
