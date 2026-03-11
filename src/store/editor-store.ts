import { create } from 'zustand';
import type { EditorState, Layout, VenueShape, Guest, Room, ActiveTool, AppView } from '../types';
import { newId } from '../lib/ids';
import { snapPosition } from '../lib/snap';
import { saveToLocalStorage } from '../lib/storage';
import { SAMPLE_LAYOUT } from '../data/sample-layout';

const MAX_HISTORY = 50;

// ─── Default shape sizes per kind ────────────────────────────────────────────

const SHAPE_DEFAULTS: Record<string, Partial<VenueShape>> = {
  'round-table':  { width: 120, height: 120, color: '#be123c', seats: 8 },
  'rect-table':   { width: 200, height: 80,  color: '#7c3aed', seats: 10 },
  'chair':        { width: 40,  height: 40,  color: '#374151', seats: 1 },
  'stage':        { width: 400, height: 120, color: '#6b7280', seats: 0 },
  'dance-floor':  { width: 320, height: 320, color: '#1e3a5f', seats: 0 },
  'zone':         { width: 200, height: 200, color: '#065f46', seats: 0 },
  'decoration':   { width: 60,  height: 60,  color: '#92400e', seats: 0 },
};

// ─── Store interface ──────────────────────────────────────────────────────────

interface EditorActions {
  // Layout
  setLayout: (layout: Layout) => void;
  updateLayoutMeta: (meta: Partial<Pick<Layout, 'name' | 'venueName' | 'venueWidth' | 'venueHeight' | 'gridSize'>>) => void;

  // Shapes
  addShape: (kind: VenueShape['kind'], x: number, y: number) => string;
  updateShape: (id: string, patch: Partial<VenueShape>) => void;
  deleteShape: (id: string) => void;
  duplicateShape: (id: string) => void;
  moveShapeToFront: (id: string) => void;
  moveShapeToBack: (id: string) => void;

  // Selection / tool
  selectShape: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setView: (view: AppView) => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleDistances: () => void;
  toggleSnap: () => void;

  // Guests
  addGuest: (guest: Omit<Guest, 'id'>) => string;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | null, seatNumber: number | null) => void;
  selectGuest: (id: string | null) => void;

  // Rooms
  addRoom: (room: Omit<Room, 'id'>) => string;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  assignGuestToRoom: (guestId: string, roomId: string | null) => void;
  selectRoom: (id: string | null) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

type StoreState = EditorState & EditorActions;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function withSave(layout: Layout): Layout {
  const updated = { ...layout, updatedAt: new Date().toISOString() };
  saveToLocalStorage(updated);
  return updated;
}

function pushHistory(state: StoreState): Partial<StoreState> {
  const trimmed = state.history.slice(0, state.historyIndex + 1).slice(-MAX_HISTORY);
  return {
    history: [...trimmed, state.layout],
    historyIndex: trimmed.length,
  };
}

// ─── Create store ─────────────────────────────────────────────────────────────

export const useEditorStore = create<StoreState>((set, get) => ({
  layout: SAMPLE_LAYOUT,
  selectedShapeId: null,
  selectedGuestId: null,
  selectedRoomId: null,
  activeTool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showDistances: true,
  snapToGrid: true,
  history: [],
  historyIndex: -1,
  view: 'editor',

  // ── Layout ──────────────────────────────────────────────────────────────
  setLayout: (layout) => set({ layout: withSave(layout), history: [], historyIndex: -1 }),

  updateLayoutMeta: (meta) =>
    set((s) => ({ layout: withSave({ ...s.layout, ...meta }) })),

  // ── Shapes ──────────────────────────────────────────────────────────────
  addShape: (kind, x, y) => {
    const id = newId();
    const snap = get().snapToGrid;
    const gridSize = get().layout.gridSize;
    const pos = snap ? snapPosition(x, y, gridSize) : { x, y };
    const defaults = SHAPE_DEFAULTS[kind] ?? {};
    const existing = get().layout.shapes.filter((s) => s.kind === kind);
    const label = `${kind.replace(/-/g, ' ')} ${existing.length + 1}`;
    const shape: VenueShape = {
      id,
      kind,
      x: pos.x,
      y: pos.y,
      width: defaults.width ?? 100,
      height: defaults.height ?? 100,
      rotation: 0,
      label: label.replace(/\b\w/g, (c) => c.toUpperCase()),
      color: defaults.color ?? '#6b7280',
      seats: defaults.seats ?? 0,
      locked: false,
      zIndex: get().layout.shapes.length,
    };
    set((s) => ({
      ...pushHistory(s as StoreState),
      layout: withSave({ ...s.layout, shapes: [...s.layout.shapes, shape] }),
      selectedShapeId: id,
      activeTool: 'select',
    }));
    return id;
  },

  updateShape: (id, patch) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        shapes: s.layout.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
      }),
    })),

  deleteShape: (id) =>
    set((s) => ({
      ...pushHistory(s as StoreState),
      layout: withSave({
        ...s.layout,
        shapes: s.layout.shapes.filter((sh) => sh.id !== id),
        guests: s.layout.guests.map((g) =>
          g.tableId === id ? { ...g, tableId: null, seatNumber: null } : g
        ),
      }),
      selectedShapeId: null,
    })),

  duplicateShape: (id) => {
    const shape = get().layout.shapes.find((s) => s.id === id);
    if (!shape) return;
    const newShape: VenueShape = { ...shape, id: newId(), x: shape.x + 40, y: shape.y + 40, label: shape.label + ' (copy)' };
    set((s) => ({
      ...pushHistory(s as StoreState),
      layout: withSave({ ...s.layout, shapes: [...s.layout.shapes, newShape] }),
      selectedShapeId: newShape.id,
    }));
  },

  moveShapeToFront: (id) =>
    set((s) => {
      const max = Math.max(...s.layout.shapes.map((sh) => sh.zIndex));
      return {
        layout: withSave({
          ...s.layout,
          shapes: s.layout.shapes.map((sh) => (sh.id === id ? { ...sh, zIndex: max + 1 } : sh)),
        }),
      };
    }),

  moveShapeToBack: (id) =>
    set((s) => {
      const min = Math.min(...s.layout.shapes.map((sh) => sh.zIndex));
      return {
        layout: withSave({
          ...s.layout,
          shapes: s.layout.shapes.map((sh) => (sh.id === id ? { ...sh, zIndex: min - 1 } : sh)),
        }),
      };
    }),

  // ── Selection / tool ────────────────────────────────────────────────────
  selectShape: (id) => set({ selectedShapeId: id, selectedGuestId: null }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedShapeId: null }),
  setView: (view) => set({ view }),

  // ── Viewport ────────────────────────────────────────────────────────────
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.2, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleDistances: () => set((s) => ({ showDistances: !s.showDistances })),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  // ── Guests ──────────────────────────────────────────────────────────────
  addGuest: (guest) => {
    const id = newId();
    set((s) => ({
      layout: withSave({ ...s.layout, guests: [...s.layout.guests, { ...guest, id }] }),
    }));
    return id;
  },

  updateGuest: (id, patch) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        guests: s.layout.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }),
    })),

  deleteGuest: (id) =>
    set((s) => ({
      layout: withSave({ ...s.layout, guests: s.layout.guests.filter((g) => g.id !== id) }),
      selectedGuestId: null,
    })),

  assignGuestToTable: (guestId, tableId, seatNumber) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        guests: s.layout.guests.map((g) =>
          g.id === guestId ? { ...g, tableId, seatNumber } : g
        ),
      }),
    })),

  selectGuest: (id) => set({ selectedGuestId: id }),

  // ── Rooms ────────────────────────────────────────────────────────────────
  addRoom: (room) => {
    const id = newId();
    set((s) => ({
      layout: withSave({ ...s.layout, rooms: [...s.layout.rooms, { ...room, id }] }),
    }));
    return id;
  },

  updateRoom: (id, patch) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        rooms: s.layout.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }),
    })),

  deleteRoom: (id) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        rooms: s.layout.rooms.filter((r) => r.id !== id),
        guests: s.layout.guests.map((g) =>
          s.layout.rooms.find((r) => r.id === id)?.guestIds.includes(g.id)
            ? { ...g }
            : g
        ),
      }),
      selectedRoomId: null,
    })),

  assignGuestToRoom: (guestId, roomId) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        rooms: s.layout.rooms.map((r) => {
          if (r.id === roomId) return { ...r, guestIds: [...new Set([...r.guestIds, guestId])] };
          return { ...r, guestIds: r.guestIds.filter((id) => id !== guestId) };
        }),
      }),
    })),

  selectRoom: (id) => set({ selectedRoomId: id }),

  // ── History ──────────────────────────────────────────────────────────────
  pushHistory: () => set((s) => pushHistory(s as StoreState)),

  undo: () =>
    set((s) => {
      if (s.historyIndex < 0) return {};
      const layout = s.history[s.historyIndex];
      return { layout: withSave(layout), historyIndex: s.historyIndex - 1 };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return {};
      const layout = s.history[s.historyIndex + 1];
      return { layout: withSave(layout), historyIndex: s.historyIndex + 1 };
    }),
}));
