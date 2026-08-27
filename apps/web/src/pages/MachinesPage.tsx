import { useCallback, useEffect, useState } from 'react';
import type { MachineStatus, UserRole } from '@fabweb/shared';
import {
  CONNECTOR_LABELS,
  INTEGRATION_LABELS,
  MACHINE_STATUS_LABELS,
  MACHINE_TYPE_LABELS,
  canEditMachineStatus,
  fetchLiveStatus,
  listMachines,
  setMachineStatus,
  type MachineDetail,
} from '../lib/machines';
import './MachinesPage.css';

interface Props {
  token: string;
  role: UserRole;
  onError: (msg: string) => void;
}

const STATUS_OPTIONS: MachineStatus[] = [
  'offline',
  'idle',
  'busy',
  'error',
  'maintenance',
];

export function MachinesPage({ token, role, onError }: Props) {
  const [items, setItems] = useState<MachineDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listMachines(token));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка загрузки станков');
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onStatus(id: string, status: MachineStatus) {
    setBusyId(id);
    try {
      await setMachineStatus(token, id, status);
      await reload();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сменить статус');
    } finally {
      setBusyId(null);
    }
  }

  async function onCheckLive(id: string) {
    setBusyId(id);
    try {
      const live = await fetchLiveStatus(token, id);
      const msg = live.connected
        ? `Онлайн · ${live.live_status?.message ?? 'ОК'}`
        : live.live_status?.message ?? 'Коннектор не подключён';
      setLiveMsg((prev) => ({ ...prev, [id]: msg }));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка проверки статуса');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="machines-page">
      <div className="page-section__header">
        <p className="page-section__desc">
          Реестр станков площадки. Коннекторы пока заглушки — интеграция Moonraker/OctoPrint
          позже. Статус можно выставлять вручную.
        </p>
        <button type="button" className="btn" onClick={reload} disabled={loading}>
          Обновить
        </button>
      </div>

      {loading ? (
        <p className="muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>Станков нет. Запустите seed: pnpm --filter @fabweb/api db:seed</p>
        </div>
      ) : (
        <div className="machines-grid">
          {items.map((m) => (
            <article key={m.id} className={`machine-card status-${m.status}`}>
              <div className="machine-card__visual">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="machine-card__img" />
                ) : (
                  <div className="machine-card__img-placeholder">
                    {MACHINE_TYPE_LABELS[m.type]}
                  </div>
                )}
                <span className={`badge badge-m-${m.status}`}>
                  {MACHINE_STATUS_LABELS[m.status]}
                </span>
              </div>

              <div className="machine-card__head">
                <div>
                  <h3>{m.name}</h3>
                  <p className="muted">
                    {m.model} · {MACHINE_TYPE_LABELS[m.type]}
                  </p>
                </div>
              </div>

              {m.purpose && <p className="machine-card__purpose">{m.purpose}</p>}

              <dl className="machine-meta">
                <div>
                  <dt>Интеграция</dt>
                  <dd>
                    {INTEGRATION_LABELS[m.integration_status] ?? m.integration_status} ·{' '}
                    {CONNECTOR_LABELS[m.connector.type]}
                    {m.connector.port ? ` :${m.connector.port}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Стол</dt>
                  <dd>
                    {m.capabilities.bed_size.x}×{m.capabilities.bed_size.y}×
                    {m.capabilities.bed_size.z} мм
                  </dd>
                </div>
                <div>
                  <dt>Материалы</dt>
                  <dd>{m.capabilities.materials.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Моточасы</dt>
                  <dd>{m.motor_hours.toFixed(1)} ч</dd>
                </div>
              </dl>

              {m.notes && <p className="machine-card__notes">{m.notes}</p>}

              {liveMsg[m.id] && (
                <p className="machine-live-hint muted">{liveMsg[m.id]}</p>
              )}

              <div className="machine-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={busyId === m.id}
                  onClick={() => onCheckLive(m.id)}
                >
                  Проверить связь
                </button>
                {canEditMachineStatus(role) && (
                  <select
                    value={m.status}
                    disabled={busyId === m.id}
                    onChange={(e) => onStatus(m.id, e.target.value as MachineStatus)}
                    aria-label={`Статус ${m.name}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {MACHINE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
