import type { CloudLayoutOwnerId } from '../types';

export type { CloudLayoutOwnerId };

const ACTIVE_OWNER_KEY = 'wedding-planner-active-cloud-owner';

export function readStoredCloudLayoutOwner(): CloudLayoutOwnerId {
  try {
    if (typeof localStorage === 'undefined') return 'self';
    const v = localStorage.getItem(ACTIVE_OWNER_KEY);
    if (!v || v === 'self') return 'self';
    return v;
  } catch {
    return 'self';
  }
}

export function persistCloudLayoutOwner(owner: CloudLayoutOwnerId): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ACTIVE_OWNER_KEY, owner === 'self' ? 'self' : owner);
  } catch {
    /* ignore */
  }
}

/** Storage bucket key for layout JSON (per owner context). */
export function layoutStorageOwnerKey(owner: CloudLayoutOwnerId): string {
  return owner === 'self' ? 'self' : owner;
}
