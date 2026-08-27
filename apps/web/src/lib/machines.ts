import type {
  ConnectorType,
  MachineIntegrationStatus,
  MachineStatus,
  MachineType,
  UserRole,
} from '@fabweb/shared';
import { api } from './api';

export interface MachineCapabilities {
  materials: string[];
  max_temp_c?: number;
  bed_size: { x: number; y: number; z: number };
  max_power_pct?: number;
}

export interface MachineDetail {
  id: string;
  name: string;
  type: MachineType;
  model: string;
  purpose: string;
  capabilities: MachineCapabilities;
  loaded_material: string | null;
  motor_hours: number;
  status: MachineStatus;
  integration_status: MachineIntegrationStatus;
  connector: {
    type: ConnectorType;
    host?: string;
    port?: number;
    enabled: boolean;
    config?: Record<string, unknown>;
  };
  live_status: {
    progress_pct?: number;
    temps?: Record<string, number>;
    camera_url?: string;
    last_seen?: string;
    message?: string;
  } | null;
  camera_url: string | null;
  image_url: string | null;
  notes: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  fdm_printer: 'FDM',
  resin_printer: 'SLA',
  laser: 'Лазер',
  solder: 'Пайка',
  wash: 'Промывка',
  uv_cure: 'УФ-засветка',
  accessory: 'Аксессуар',
};

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  idle: 'Свободен',
  busy: 'Занят',
  error: 'Ошибка',
  maintenance: 'Обслуживание',
  offline: 'Офлайн',
};

export const INTEGRATION_LABELS: Record<MachineIntegrationStatus, string> = {
  stub: 'Заглушка',
  planned: 'Запланировано',
  connected: 'Подключён',
};

export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  manual: 'Вручную',
  moonraker: 'Moonraker',
  octoprint: 'OctoPrint',
  custom: 'Свой',
};

export async function listMachines(token: string): Promise<MachineDetail[]> {
  return api<MachineDetail[]>('/api/v1/machines', {}, token);
}

export async function setMachineStatus(
  token: string,
  id: string,
  status: MachineStatus,
): Promise<MachineDetail> {
  return api<MachineDetail>(
    `/api/v1/machines/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
}

export async function fetchLiveStatus(
  token: string,
  id: string,
): Promise<{
  connected: boolean;
  status: MachineStatus;
  live_status: MachineDetail['live_status'];
}> {
  return api(`/api/v1/machines/${id}/live-status`, {}, token);
}

export function canEditMachineStatus(role: UserRole): boolean {
  return role === 'admin' || role === 'worker' || role === 'supervisor';
}
