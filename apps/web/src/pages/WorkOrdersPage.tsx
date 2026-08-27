import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { UserRole, WorkOrderPriority, WorkOrderSource, WorkOrderTech } from '@fabweb/shared';
import {
  PRIORITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  TECH_LABELS,
  approveWorkOrder,
  canApprove,
  canManageFloor,
  createWorkOrder,
  enqueueWorkOrder,
  formatRub,
  listQueue,
  listWorkOrders,
  rejectWorkOrder,
  setWorkOrderStatus,
  submitWorkOrder,
  type WorkOrderDetail,
} from '../lib/workorders';
import './WorkOrdersPage.css';

interface Props {
  token: string;
  role: UserRole;
  userId: string;
  onError: (msg: string) => void;
}

type Tab = 'all' | 'queue' | 'create';

export function WorkOrdersPage({ token, role, userId, onError }: Props) {
  const [tab, setTab] = useState<Tab>('all');
  const [items, setItems] = useState<WorkOrderDetail[]>([]);
  const [queue, setQueue] = useState<WorkOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tech, setTech] = useState<WorkOrderTech>('fdm');
  const [priority, setPriority] = useState<WorkOrderPriority>('normal');
  const [source, setSource] = useState<WorkOrderSource>('commercial');
  const [fastTrack, setFastTrack] = useState(false);
  const [weightG, setWeightG] = useState('50');
  const [printHours, setPrintHours] = useState('2');
  const [materialPrice, setMaterialPrice] = useState('1500');
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [all, q] = await Promise.all([listWorkOrders(token), listQueue(token)]);
      setItems(all);
      setQueue(q);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка загрузки очереди');
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function runAction(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await reload();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка действия');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const cost_input =
        tech === 'fdm'
          ? {
              tech: 'fdm' as const,
              material_price_per_kg: Number(materialPrice) || 1500,
              calc_type: 'weight' as const,
              weight_g: Number(weightG) || 0,
              material: 'PLA',
              print_hours: Number(printHours) || 0,
              print_minutes: 0,
              modeling_hours: 0,
              markup_pct: 50,
            }
          : undefined;

      await createWorkOrder(token, {
        title: title.trim(),
        notes: notes.trim(),
        tech,
        priority,
        source,
        fast_track: canApprove(role) ? fastTrack : false,
        cost_input,
      });
      setTitle('');
      setNotes('');
      setFastTrack(false);
      setTab('all');
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Не удалось создать заказ');
    } finally {
      setCreating(false);
    }
  }

  function renderActions(wo: WorkOrderDetail) {
    const busy = busyId === wo.id;
    const isOwner = wo.requested_by === userId;
    const buttons: ReactNode[] = [];

    if (wo.status === 'draft' && (isOwner || role === 'admin')) {
      buttons.push(
        <button
          key="submit"
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => runAction(wo.id, () => submitWorkOrder(token, wo.id))}
        >
          На согласование
        </button>,
      );
    }

    if (
      (wo.status === 'pending_approval' && role === 'admin') ||
      (wo.status === 'draft' && canApprove(role))
    ) {
      buttons.push(
        <button
          key="approve"
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => runAction(wo.id, () => approveWorkOrder(token, wo.id))}
        >
          Одобрить
        </button>,
      );
    }

    if (wo.status === 'pending_approval' && role === 'admin') {
      buttons.push(
        <button
          key="reject"
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => runAction(wo.id, () => rejectWorkOrder(token, wo.id))}
        >
          Отклонить
        </button>,
      );
    }

    if (wo.status === 'approved' && canManageFloor(role)) {
      buttons.push(
        <button
          key="enqueue"
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => runAction(wo.id, () => enqueueWorkOrder(token, wo.id))}
        >
          В очередь
        </button>,
      );
    }

    if (wo.status === 'queued' && canManageFloor(role)) {
      buttons.push(
        <button
          key="start"
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            runAction(wo.id, () => setWorkOrderStatus(token, wo.id, 'in_progress'))
          }
        >
          В работу
        </button>,
      );
    }

    if (wo.status === 'in_progress' && canManageFloor(role)) {
      buttons.push(
        <button
          key="done"
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => runAction(wo.id, () => setWorkOrderStatus(token, wo.id, 'done'))}
        >
          Готово
        </button>,
      );
      buttons.push(
        <button
          key="fail"
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => runAction(wo.id, () => setWorkOrderStatus(token, wo.id, 'failed'))}
        >
          Сбой
        </button>,
      );
    }

    if (
      ['draft', 'pending_approval', 'approved', 'queued', 'assigned', 'in_progress'].includes(
        wo.status,
      ) &&
      (isOwner || role === 'admin')
    ) {
      buttons.push(
        <button
          key="cancel"
          type="button"
          className="btn btn-danger-ghost"
          disabled={busy}
          onClick={() => runAction(wo.id, () => setWorkOrderStatus(token, wo.id, 'cancelled'))}
        >
          Отмена
        </button>,
      );
    }

    return buttons.length ? <div className="wo-actions">{buttons}</div> : null;
  }

  const list = tab === 'queue' ? queue : items;

  return (
    <div className="wo-page">
      <div className="page-section__header">
        <p className="page-section__desc">
          Очередь 3D / лазер: создание, согласование администратором, постановка в очередь
        </p>
        <div className="header-btns">
          <button type="button" className="btn" onClick={reload} disabled={loading}>
            Обновить
          </button>
          {role !== 'guest' && (
            <button type="button" className="btn btn-primary" onClick={() => setTab('create')}>
              + Новый заказ
            </button>
          )}
        </div>
      </div>

      <div className="wo-tabs">
        <button
          type="button"
          className={tab === 'all' ? 'wo-tab active' : 'wo-tab'}
          onClick={() => setTab('all')}
        >
          Все ({items.length})
        </button>
        <button
          type="button"
          className={tab === 'queue' ? 'wo-tab active' : 'wo-tab'}
          onClick={() => setTab('queue')}
        >
          Очередь ({queue.length})
        </button>
        {role !== 'guest' && (
          <button
            type="button"
            className={tab === 'create' ? 'wo-tab active' : 'wo-tab'}
            onClick={() => setTab('create')}
          >
            Создать
          </button>
        )}
      </div>

      {tab === 'create' ? (
        <form className="wo-form card" onSubmit={handleCreate}>
          <h3>Новый заказ</h3>
          <label>
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              placeholder="Корпус датчика — PLA"
            />
          </label>
          <label>
            Описание / заметки
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Материал, цвет, особые требования…"
            />
          </label>
          <div className="wo-form__row">
            <label>
              Технология
              <select value={tech} onChange={(e) => setTech(e.target.value as WorkOrderTech)}>
                <option value="fdm">FDM</option>
                <option value="sla">SLA</option>
                <option value="laser">Лазер</option>
              </select>
            </label>
            <label>
              Приоритет
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
              >
                {(Object.keys(PRIORITY_LABELS) as WorkOrderPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Источник
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as WorkOrderSource)}
              >
                <option value="commercial">Коммерческий</option>
                <option value="internal">Внутренний</option>
              </select>
            </label>
          </div>

          {tech === 'fdm' && (
            <div className="wo-form__row">
              <label>
                Вес, г
                <input value={weightG} onChange={(e) => setWeightG(e.target.value)} type="number" min="0" />
              </label>
              <label>
                Часы печати
                <input
                  value={printHours}
                  onChange={(e) => setPrintHours(e.target.value)}
                  type="number"
                  min="0"
                  step="0.1"
                />
              </label>
              <label>
                Цена материала, ₽/кг
                <input
                  value={materialPrice}
                  onChange={(e) => setMaterialPrice(e.target.value)}
                  type="number"
                  min="0"
                />
              </label>
            </div>
          )}

          {canApprove(role) && (
            <label className="wo-check">
              <input
                type="checkbox"
                checked={fastTrack}
                onChange={(e) => setFastTrack(e.target.checked)}
              />
              Ускоренное согласование: сразу одобрить
            </label>
          )}

          <div className="header-btns">
            <button type="button" className="btn" onClick={() => setTab('all')}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || title.trim().length < 2}>
              {creating ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      ) : loading ? (
        <p className="muted">Загрузка…</p>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p>{tab === 'queue' ? 'Очередь пуста' : 'Заказов пока нет'}</p>
          {role !== 'guest' && (
            <button type="button" className="btn btn-primary" onClick={() => setTab('create')}>
              Создать первый заказ
            </button>
          )}
        </div>
      ) : (
        <div className="wo-list">
          {list.map((wo) => (
            <article key={wo.id} className={`wo-card badge-${wo.status}`}>
              <div className="wo-card__head">
                <div>
                  <h3>{wo.title}</h3>
                  <p className="muted">
                    {SOURCE_LABELS[wo.source]} · {TECH_LABELS[wo.tech]} ·{' '}
                    {PRIORITY_LABELS[wo.priority]}
                    {wo.queue_position != null ? ` · #${wo.queue_position}` : ''}
                  </p>
                </div>
                <span className={`badge badge-${wo.status}`}>{STATUS_LABELS[wo.status]}</span>
              </div>
              {wo.notes && <p className="wo-card__notes">{wo.notes}</p>}
              <div className="wo-card__meta">
                <span>Запросил: {wo.requester.full_name}</span>
                {wo.approver && <span>Одобрил: {wo.approver.full_name}</span>}
                {wo.project && <span>Проект: {wo.project.title}</span>}
                <span>
                  Цена: {formatRub(wo.cost_breakdown?.final_price)}
                </span>
              </div>
              {renderActions(wo)}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
