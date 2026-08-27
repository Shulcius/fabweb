import type {
  CostBreakdown,
  DeductionMode,
  UserRole,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
  WorkOrderTech,
} from '@fabweb/shared';
import { api } from './api';

export interface WorkOrderUserRef {
  id: string;
  full_name: string;
  email: string;
}

export interface WorkOrderDetail {
  id: string;
  title: string;
  notes: string;
  source: WorkOrderSource;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  tech: WorkOrderTech;
  deduction_mode: DeductionMode;
  project_id: string | null;
  artifact_id: string | null;
  requested_by: string;
  approved_by: string | null;
  machine_id: string | null;
  queue_position: number | null;
  cost_input: Record<string, unknown> | null;
  cost_breakdown: CostBreakdown | null;
  sub_jobs: unknown;
  created_at: string;
  updated_at: string;
  requester: WorkOrderUserRef;
  approver: WorkOrderUserRef | null;
  project: { id: string; title: string } | null;
}

export interface CreateWorkOrderPayload {
  title: string;
  notes?: string;
  source?: WorkOrderSource;
  priority?: WorkOrderPriority;
  tech: WorkOrderTech;
  deduction_mode?: DeductionMode;
  project_id?: string;
  cost_input?: Record<string, unknown>;
  fast_track?: boolean;
}

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Черновик',
  pending_approval: 'На согласовании',
  approved: 'Одобрен',
  queued: 'В очереди',
  assigned: 'Назначен',
  in_progress: 'В работе',
  post_process: 'Постобработка',
  done: 'Готово',
  failed: 'Сбой',
  cancelled: 'Отменён',
};

export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
  urgent: 'Срочный',
};

export const TECH_LABELS: Record<WorkOrderTech, string> = {
  fdm: 'FDM',
  sla: 'SLA',
  laser: 'Лазер',
};

export const SOURCE_LABELS: Record<WorkOrderSource, string> = {
  commercial: 'Коммерческий',
  internal: 'Внутренний',
};

export function formatRub(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return `${amount.toFixed(2)} ₽`;
}

export async function listWorkOrders(token: string): Promise<WorkOrderDetail[]> {
  return api<WorkOrderDetail[]>('/api/v1/workorders', {}, token);
}

export async function listQueue(token: string): Promise<WorkOrderDetail[]> {
  return api<WorkOrderDetail[]>('/api/v1/workorders/queue', {}, token);
}

export async function createWorkOrder(
  token: string,
  payload: CreateWorkOrderPayload,
): Promise<WorkOrderDetail> {
  return api<WorkOrderDetail>(
    '/api/v1/workorders',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export async function submitWorkOrder(token: string, id: string): Promise<WorkOrderDetail> {
  return api<WorkOrderDetail>(`/api/v1/workorders/${id}/submit`, { method: 'POST', body: '{}' }, token);
}

export async function approveWorkOrder(token: string, id: string): Promise<WorkOrderDetail> {
  return api<WorkOrderDetail>(`/api/v1/workorders/${id}/approve`, { method: 'POST', body: '{}' }, token);
}

export async function rejectWorkOrder(token: string, id: string): Promise<WorkOrderDetail> {
  return api<WorkOrderDetail>(`/api/v1/workorders/${id}/reject`, { method: 'POST', body: '{}' }, token);
}

export async function enqueueWorkOrder(token: string, id: string): Promise<WorkOrderDetail> {
  return api<WorkOrderDetail>(`/api/v1/workorders/${id}/enqueue`, { method: 'POST', body: '{}' }, token);
}

export async function setWorkOrderStatus(
  token: string,
  id: string,
  status: WorkOrderStatus,
): Promise<WorkOrderDetail> {
  return api<WorkOrderDetail>(
    `/api/v1/workorders/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
}

export function canApprove(role: UserRole): boolean {
  return role === 'admin' || role === 'supervisor';
}

export function canManageFloor(role: UserRole): boolean {
  return role === 'admin' || role === 'worker' || role === 'supervisor';
}
