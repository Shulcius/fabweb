/** Подписи ролей и микроролей для UI (ключи enum не меняем). */

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  worker: 'Работник',
  supervisor: 'Научный руководитель',
  guest: 'Гость',
};

export const MICRO_ROLE_LABELS: Record<string, string> = {
  constructor: 'Конструктор',
  electronics: 'Электронщик',
  programmer: 'Программист',
};

export function formatMicroRoles(roles: string[]): string {
  if (!roles.length) return '—';
  return roles.map((r) => MICRO_ROLE_LABELS[r] ?? r).join(', ');
}
