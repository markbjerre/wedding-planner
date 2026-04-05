import type { Layout } from '../types';
import { DEFAULT_LAYERS } from '../types';
import { normalizeLayout } from './constraints';

/**
 * Parse JSON text and return a normalized Layout (defaults for missing arrays, migration).
 * Throws if the payload is not a usable layout object.
 */
export function parseLayoutFromJsonText(text: string): Layout {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${msg}`);
  }
  return parseLayoutValue(raw);
}

function parseLayoutValue(raw: unknown): Layout {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Layout root must be a JSON object');
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) throw new Error('Layout.id must be a non-empty string');
  if (typeof o.name !== 'string') throw new Error('Layout.name must be a string');

  const layout = {
    ...o,
    shapes: Array.isArray(o.shapes) ? o.shapes : [],
    guests: Array.isArray(o.guests) ? o.guests : [],
    rooms: Array.isArray(o.rooms) ? o.rooms : [],
    layers: Array.isArray(o.layers) && o.layers.length > 0 ? o.layers : DEFAULT_LAYERS,
    constraints: Array.isArray(o.constraints) ? o.constraints : [],
    version: typeof o.version === 'number' ? o.version : 1,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(0).toISOString(),
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
  } as Layout;

  return normalizeLayout(layout);
}

/**
 * Shallow merge: patch keys replace top-level fields on the layout (same as spreading patch onto the file).
 * Result is normalized and `updatedAt` is refreshed.
 */
export function mergeLayoutPatch(base: Layout, patch: Record<string, unknown>): Layout {
  const merged = { ...base, ...patch } as Layout;
  return normalizeLayout({
    ...merged,
    updatedAt: new Date().toISOString(),
  });
}

/** Read a value from a nested object/array using dot segments; numeric segments index arrays. */
export function getAtPath(root: unknown, path: string): unknown {
  const segments = path.split('.').filter((s) => s.length > 0);
  let cur: unknown = root;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    const key = /^\d+$/.test(seg) ? Number(seg) : seg;
    if (Array.isArray(cur)) {
      if (typeof key !== 'number' || key < 0 || key >= cur.length) return undefined;
      cur = cur[key];
    } else {
      cur = (cur as Record<string, unknown>)[key as string];
    }
  }
  return cur;
}
