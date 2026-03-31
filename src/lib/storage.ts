import type { Layout } from '../types';

const LEGACY_STORAGE_KEY = 'wedding-planner-layout';

function keyForOwner(ownerKey: string): string {
  return `wedding-planner-layout:${ownerKey}`;
}

/** Persist layout to localStorage (per cloud project owner bucket). */
export function saveToLocalStorage(layout: Layout, ownerKey: string = 'self'): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const k = keyForOwner(ownerKey);
    localStorage.setItem(k, JSON.stringify({ ...layout, updatedAt: new Date().toISOString() }));
  } catch {
    console.error('Failed to save layout to localStorage');
  }
}

/** Load layout from localStorage for this owner bucket; migrates legacy single key once. */
export function loadFromLocalStorage(ownerKey: string = 'self'): Layout | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const k = keyForOwner(ownerKey);
    let raw = localStorage.getItem(k);
    if (!raw && ownerKey === 'self') {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(k, raw);
      }
    }
    return raw ? (JSON.parse(raw) as Layout) : null;
  } catch {
    return null;
  }
}

/** Trigger a browser download of the layout as a JSON file. */
export function downloadLayoutJSON(layout: Layout): void {
  const data = JSON.stringify({ ...layout, updatedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${layout.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a JSON file uploaded by the user and return a Layout. */
export function loadFromFile(): Promise<Layout> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as Layout;
          resolve(parsed);
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
