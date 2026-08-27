import type { UserRole } from '@fabweb/shared';

export const TOKEN_KEY = 'fabweb_token';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  micro_roles: string[];
  pd_consent_at: string | null;
}

export type AppView =
  | 'dashboard'
  | 'projects'
  | 'project-create'
  | 'project-detail'
  | 'workorders'
  | 'machines'
  | 'users'
  | 'showcase';

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.error?.message ?? err.message ?? 'Ошибка запроса';
    throw new Error(typeof msg === 'string' ? msg : 'Ошибка запроса');
  }
  return res.json();
}
