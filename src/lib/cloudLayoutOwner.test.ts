import { describe, it, expect } from 'vitest';
import { resolveLayoutRowUserId, layoutStorageOwnerKey } from './cloudLayoutOwner';

describe('cloudLayoutOwner', () => {
  it('resolves self to session user', () => {
    expect(resolveLayoutRowUserId('user-abc', 'self')).toBe('user-abc');
  });

  it('resolves shared owner id', () => {
    expect(resolveLayoutRowUserId('user-abc', 'owner-xyz')).toBe('owner-xyz');
  });

  it('storage key', () => {
    expect(layoutStorageOwnerKey('self')).toBe('self');
    expect(layoutStorageOwnerKey('uuid-here')).toBe('uuid-here');
  });
});
