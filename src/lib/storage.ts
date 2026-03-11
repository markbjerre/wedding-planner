import type { Layout } from '../types';

const STORAGE_KEY = 'wedding-planner-layout';

/** Persist layout to localStorage. */
export function saveToLocalStorage(layout: Layout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...layout, updatedAt: new Date().toISOString() }));
  } catch {
    console.error('Failed to save layout to localStorage');
  }
}

/** Load layout from localStorage, returns null if nothing saved. */
export function loadFromLocalStorage(): Layout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
