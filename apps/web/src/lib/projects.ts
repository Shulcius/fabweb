import type { ProjectDomain, ProjectStatus, ProjectType } from '@fabweb/shared';

export type AssetKind = 'photo' | 'document' | 'model_3d' | 'pcb' | 'firmware' | 'other';

export interface ProjectSettings {
  intended_use?: string;
  disciplines?: string[];
  needs_3d_print?: boolean;
  material_notes?: string;
  target_platform?: string;
}

export interface ProjectAsset {
  id: string;
  kind: AssetKind;
  title: string;
  description: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_cover: boolean;
  version: number;
  created_at: string;
}

export interface ProjectDetail {
  id: string;
  title: string;
  summary: string;
  description: string;
  goals: string;
  tags: string[];
  settings: ProjectSettings;
  type: ProjectType;
  domain: ProjectDomain;
  status: ProjectStatus;
  parent_project_id: string | null;
  owner_id: string;
  showcase_published: boolean;
  assets: ProjectAsset[];
  owner: { id: string; full_name: string; email: string };
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  title: string;
  summary: string;
  description: string;
  goals?: string;
  tags?: string[];
  settings?: ProjectSettings;
  type: ProjectType;
  domain?: ProjectDomain;
  parent_project_id?: string;
}

export interface PendingUpload {
  id: string;
  file: File;
  kind: AssetKind;
  title: string;
  description: string;
  is_cover: boolean;
}

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  photo: 'Фото',
  document: 'Документ',
  model_3d: '3D-модель',
  pcb: 'Печатная плата',
  firmware: 'Прошивка / код',
  other: 'Другое',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  diy: 'Самоделка',
  machine_part: 'Деталь станка',
  device: 'Устройство',
  pcb: 'Печатная плата',
  firmware: 'Прошивка',
  mixed: 'Смешанный проект',
};

export async function uploadProjectAsset(
  token: string,
  projectId: string,
  upload: PendingUpload,
): Promise<ProjectAsset> {
  const form = new FormData();
  form.append('file', upload.file);
  form.append('kind', upload.kind);
  form.append('title', upload.title);
  form.append('description', upload.description);
  form.append('is_cover', String(upload.is_cover));

  const res = await fetch(`/api/v1/projects/${projectId}/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message ?? 'Ошибка загрузки';
    throw new Error(msg);
  }
  return res.json();
}

export function assetFileUrl(projectId: string, assetId: string): string {
  return `/api/v1/projects/${projectId}/assets/${assetId}/file`;
}

export async function fetchAssetBlob(token: string, projectId: string, assetId: string): Promise<string> {
  const res = await fetch(assetFileUrl(projectId, assetId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Не удалось загрузить файл');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
