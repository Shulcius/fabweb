import { describe, expect, it } from 'vitest';
import type { UserRole } from './index';

describe('@fabweb/shared', () => {
  it('exports domain types', () => {
    const role: UserRole = 'admin';
    expect(role).toBe('admin');
  });
});
