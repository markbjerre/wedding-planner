import { create } from 'zustand';
import type {
  EditorState, Layout, VenueShape, Guest, Room,
  ActiveTool, AppView, SidebarTab, LayerId, BoxEdge, EdgeDistanceConstraint,
} from '../types';
import { SHAPE_DEFAULT_LAYER, ALL_LAYER_IDS } from '../types';
import { newId } from '../lib/ids';
import { snapPosition } from '../lib/snap';
import { loadFromLocalStorage, saveToLocalStorage } from '../lib/storage';
import { queueRemoteSave } from '../lib/remoteSaveQueue';
import { SAMPLE_LAYOUT } from '../data/sample-layout';
import {
  normalizeLayout,
  satisfyConstraintsAfterMove,
  removeConstraintsForShape,
  isValidEdgePair,
} from '../lib/constraints';

const MAX_HISTORY = 50;

const SHAPE_DEFAULTS: Record<string, Partial<VenueShape>> = {
  'round-table':  { width: 120, height: 120, color: '#a16207', seats: 8 },
  'rect-table':   { width: 200, height: 80,  color: '#7c3aed', seats: 10 },
  'chair':        { width: 36,  height: 36,  color: '#78716c', seats: 1 },
  'stage':        { width: 400, height: 120, color: '#57534e', seats: 0 },
  'dance-floor':  { width: 320, height: 320, color: '#1c4966', seats: 0 },
  'zone':         { width: 200, height: 200, color: '#14532d', seats: 0 },
  'decoration':   { width: 60,  height: 60,  color: '#92400e', seats: 0 },
  'wall':         { width: 320, height: 20,  color: '#64748b', seats: 0 },
  'pillar':       { width: 48,  height: 48,  color: '#475569', seats: 0 },
  'door':         { width: 40,  height: 100, color: '#92400e', seats: 0 },
  'item':         { width: 72,  height: 72,  color: '#94a3b8', seats: 0 },
};

interface EditorActions {
  setLayout: (layout: Layout) => void;
  updateLayoutMeta: (meta: Partial<Pick<Layout, 'name' | 'venueName' | 'venueWidthM' | 'venueHeightM' | 'gridSizeM' | 'scale'>>) => void;
  addShape: (kind: VenueShape['kind'], x: number, y: number) => string;
  updateShape: (id: string, patch: Partial<VenueShape>) => void;
  deleteShape: (id: string) => void;
  duplicateShape: (id: string) => void;
  moveShapeToFront: (id: string) => void;
  moveShapeToBack: (id: string) => void;
  selectShape: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setView: (view: AppView) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleDistances: () => void;
  toggleSnap: () => void;
  setActiveLayer: (id: LayerId) => void;
  toggleLayerVisibility: (id: LayerId) => void;
  toggleLayerLock: (id: LayerId) => void;
  /** Multi-select: which layers’ shapes are shown on the canvas. */
  toggleCanvasLayerFilter: (id: LayerId) => void;
  setCanvasLayerFilterIds: (ids: LayerId[]) => void;
  showAllCanvasLayers: () => void;
  addGuest: (guest: Omit<Guest, 'id'>) => string;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | null, seatNumber: number | null) => void;
  selectGuest: (id: string | null) => void;
  addRoom: (room: Omit<Room, 'id'>) => string;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  assignGuestToRoom: (guestId: string, roomId: string | null) => void;
  selectRoom: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  dimensionTapShape: (shapeId: string) => void;
  dimensionPickEdge: (edge: BoxEdge) => void;
  addEdgeDistanceConstraint: (distanceM: number) => void;
  removeConstraint: (constraintId: string) => void;
  cancelDimensionFlow: () => void;
  /** Anchor A = venue wall (then pick edge in sidebar). */
  dimensionSelectRoomAnchor: () => void;
  selectConstraint: (constraintId: string | null) => void;
}

type StoreState = EditorState & EditorActions;

function withSave(layout: Layout): Layout {
  const updated = { ...layout, updatedAt: new Date().toISOString() };
  saveToLocalStorage(updated);
  queueRemoteSave();
  return updated;
}

function pushHistoryFn(state: StoreState): Partial<StoreState> {
  const trimmed = state.history.slice(0, state.historyIndex + 1).slice(-MAX_HISTORY);
  return { history: [...trimmed, state.layout], historyIndex: trimmed.length };
}

/** Prefer browser localStorage so edits survive refresh and new dev/prod builds (same origin). */
function loadInitialLayout(): Layout {
  const saved = loadFromLocalStorage();
  if (saved) return normalizeLayout(saved);
  return normalizeLayout(SAMPLE_LAYOUT);
}

const INITIAL_LAYOUT = loadInitialLayout();

export const useEditorStore = create<StoreState>((set, get) => ({
  layout: INITIAL_LAYOUT,
  selectedShapeId: null,
  selectedGuestId: null,
  selectedRoomId: null,
  activeTool: 'select',
  activeLayerId: 'tables',
  canvasLayerFilterIds: [...ALL_LAYER_IDS],
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showDistances: true,
  snapToGrid: true,
  history: [],
  historyIndex: -1,
  view: 'editor',
  sidebarTab: 'layout',
  dimensionFlow: null,
  selectedConstraintId: null,

  setLayout: (layout) =>
    set({
      layout: withSave(normalizeLayout(layout)),
      history: [],
      historyIndex: -1,
      selectedConstraintId: null,
    }),

  updateLayoutMeta: (meta) =>
    set((s) => {
      let layout: Layout = { ...s.layout, ...meta };
      if (
        meta.venueWidthM !== undefined ||
        meta.venueHeightM !== undefined ||
        meta.scale !== undefined
      ) {
        layout = satisfyConstraintsAfterMove(layout);
      }
      return { layout: withSave(layout) };
    }),

  addShape: (kind, x, y) => {
    const id = newId();
    const snap = get().snapToGrid;
    const scale = get().layout.scale;
    const gridSize = get().layout.gridSizeM * scale;
    const pos = snap ? snapPosition(x, y, gridSize) : { x, y };
    const defaults = SHAPE_DEFAULTS[kind] ?? {};
    const existing = get().layout.shapes.filter((s) => s.kind === kind);
    const label = `${kind.replace(/-/g, ' ')} ${existing.length + 1}`;
    const layer = SHAPE_DEFAULT_LAYER[kind] ?? 'tables';
    const shape: VenueShape = {
      id, kind, layer,
      x: pos.x, y: pos.y,
      width: defaults.width ?? 100,
      height: defaults.height ?? 100,
      rotation: 0,
      label: label.replace(/\b\w/g, (c) => c.toUpperCase()),
      color: defaults.color ?? '#78716c',
      seats: defaults.seats ?? 0,
      locked: false,
      zIndex: get().layout.shapes.length,
    };
    set((s) => ({
      ...pushHistoryFn(s as StoreState),
      layout: withSave({ ...s.layout, shapes: [...s.layout.shapes, shape] }),
      selectedShapeId: id,
      selectedConstraintId: null,
      activeTool: 'select',
      sidebarTab: 'properties',
    }));
    return id;
  },

  updateShape: (id, patch) =>
    set((s) => {
      const shapes = s.layout.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh));
      let layout: Layout = { ...s.layout, shapes };
      // Resize / rotation changes gaps as much as position; anchor size changes must re-drive B.
      layout = satisfyConstraintsAfterMove(layout);
      return { layout: withSave(layout) };
    }),

  deleteShape: (id) =>
    set((s) => ({
      ...pushHistoryFn(s as StoreState),
      layout: withSave({
        ...s.layout,
        shapes: s.layout.shapes.filter((sh) => sh.id !== id),
        constraints: removeConstraintsForShape(s.layout.constraints, id),
        guests: s.layout.guests.map((g) =>
          g.tableId === id ? { ...g, tableId: null, seatNumber: null } : g
        ),
      }),
      selectedShapeId: null,
      sidebarTab: 'layout',
    })),

  duplicateShape: (id) => {
    const shape = get().layout.shapes.find((s) => s.id === id);
    if (!shape) return;
    const newShape: VenueShape = { ...shape, id: newId(), x: shape.x + 40, y: shape.y + 40, label: shape.label + ' copy' };
    set((s) => {
      let layout: Layout = { ...s.layout, shapes: [...s.layout.shapes, newShape] };
      layout = satisfyConstraintsAfterMove(layout);
      return {
        ...pushHistoryFn(s as StoreState),
        layout: withSave(layout),
        selectedShapeId: newShape.id,
        selectedConstraintId: null,
      };
    });
  },

  moveShapeToFront: (id) =>
    set((s) => {
      const max = Math.max(...s.layout.shapes.map((sh) => sh.zIndex));
      return { layout: withSave({ ...s.layout, shapes: s.layout.shapes.map((sh) => (sh.id === id ? { ...sh, zIndex: max + 1 } : sh)) }) };
    }),

  moveShapeToBack: (id) =>
    set((s) => {
      const min = Math.min(...s.layout.shapes.map((sh) => sh.zIndex));
      return { layout: withSave({ ...s.layout, shapes: s.layout.shapes.map((sh) => (sh.id === id ? { ...sh, zIndex: min - 1 } : sh)) }) };
    }),

  selectShape: (id) =>
    set((s) => ({
      selectedShapeId: id,
      selectedConstraintId: null,
      selectedGuestId: null,
      sidebarTab:
        s.activeTool === 'dimension' ? 'layout' : id ? 'properties' : 'layout',
    })),

  selectConstraint: (constraintId) =>
    set((s) => ({
      selectedConstraintId: constraintId,
      selectedShapeId: constraintId ? null : s.selectedShapeId,
      sidebarTab: constraintId ? 'layout' : s.sidebarTab,
    })),

  setActiveTool: (tool) => {
    if (tool === 'dimension') {
      set({
        activeTool: 'dimension',
        selectedShapeId: null,
        selectedConstraintId: null,
        dimensionFlow: {
          step: 'pickA',
          anchorAIsRoom: false,
          shapeAId: null,
          edgeA: null,
          shapeBId: null,
          edgeB: null,
        },
        sidebarTab: 'layout',
      });
      return;
    }
    set({ activeTool: tool, selectedShapeId: null, selectedConstraintId: null, dimensionFlow: null });
  },

  dimensionSelectRoomAnchor: () => {
    const s = get();
    if (s.activeTool !== 'dimension' || !s.dimensionFlow || s.dimensionFlow.step !== 'pickA') return;
    set({
      dimensionFlow: {
        ...s.dimensionFlow,
        step: 'edgeA',
        anchorAIsRoom: true,
        shapeAId: null,
      },
      selectedShapeId: null,
      selectedConstraintId: null,
      sidebarTab: 'layout',
    });
  },

  dimensionTapShape: (shapeId) => {
    const s = get();
    if (s.activeTool !== 'dimension' || !s.dimensionFlow) return;
    const flow = s.dimensionFlow;
    if (flow.step === 'pickA') {
      set({
        dimensionFlow: {
          ...flow,
          step: 'edgeA',
          anchorAIsRoom: false,
          shapeAId: shapeId,
        },
        selectedShapeId: shapeId,
        selectedConstraintId: null,
        sidebarTab: 'layout',
      });
      return;
    }
    if (flow.step === 'pickB') {
      if (flow.shapeAId && shapeId === flow.shapeAId) return;
      set({
        dimensionFlow: { ...flow, step: 'edgeB', shapeBId: shapeId },
        selectedShapeId: shapeId,
        selectedConstraintId: null,
        sidebarTab: 'layout',
      });
    }
  },

  dimensionPickEdge: (edge) => {
    const s = get();
    if (s.activeTool !== 'dimension' || !s.dimensionFlow) return;
    const flow = s.dimensionFlow;
    if (flow.step === 'edgeA' && (flow.shapeAId !== null || flow.anchorAIsRoom)) {
      set({ dimensionFlow: { ...flow, step: 'pickB', edgeA: edge } });
      return;
    }
    if (
      flow.step === 'edgeB' &&
      flow.shapeBId &&
      flow.edgeA !== null &&
      (flow.shapeAId !== null || flow.anchorAIsRoom)
    ) {
      if (!isValidEdgePair(flow.edgeA, edge)) return;
      set({ dimensionFlow: { ...flow, step: 'value', edgeB: edge } });
    }
  },

  addEdgeDistanceConstraint: (distanceM) => {
    const s = get();
    if (!s.dimensionFlow || s.dimensionFlow.step !== 'value') return;
    const { anchorAIsRoom, shapeAId, edgeA, shapeBId, edgeB } = s.dimensionFlow;
    if (edgeA === null || !shapeBId || edgeB === null) return;
    if (!anchorAIsRoom && !shapeAId) return;
    if (!isValidEdgePair(edgeA, edgeB)) return;
    const constraint: EdgeDistanceConstraint = {
      id: newId(),
      shapeAId: anchorAIsRoom ? null : shapeAId,
      edgeA,
      shapeBId,
      edgeB,
      distanceM: Math.max(0, distanceM),
    };
    let layout: Layout = {
      ...s.layout,
      constraints: [...s.layout.constraints, constraint],
    };
    layout = satisfyConstraintsAfterMove(layout);
    set((st) => ({
      ...pushHistoryFn(st as StoreState),
      layout: withSave(layout),
      dimensionFlow: {
        step: 'pickA',
        anchorAIsRoom: false,
        shapeAId: null,
        edgeA: null,
        shapeBId: null,
        edgeB: null,
      },
      selectedShapeId: null,
      selectedConstraintId: null,
    }));
  },

  removeConstraint: (constraintId) =>
    set((s) => ({
      selectedConstraintId:
        s.selectedConstraintId === constraintId ? null : s.selectedConstraintId,
      layout: withSave({
        ...s.layout,
        constraints: s.layout.constraints.filter((c) => c.id !== constraintId),
      }),
    })),

  cancelDimensionFlow: () =>
    set((s) => ({
      dimensionFlow:
        s.activeTool === 'dimension'
          ? {
              step: 'pickA',
              anchorAIsRoom: false,
              shapeAId: null,
              edgeA: null,
              shapeBId: null,
              edgeB: null,
            }
          : null,
      selectedShapeId: null,
      selectedConstraintId: null,
    })),
  setView: (view) => set({ view }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.2, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleDistances: () => set((s) => ({ showDistances: !s.showDistances })),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setActiveLayer: (id) => set({ activeLayerId: id }),

  toggleCanvasLayerFilter: (id) =>
    set((s) => {
      const has = s.canvasLayerFilterIds.includes(id);
      const next = has
        ? s.canvasLayerFilterIds.filter((x) => x !== id)
        : [...s.canvasLayerFilterIds, id];
      return { canvasLayerFilterIds: next };
    }),

  setCanvasLayerFilterIds: (ids) => set({ canvasLayerFilterIds: ids }),

  showAllCanvasLayers: () => set({ canvasLayerFilterIds: [...ALL_LAYER_IDS] }),

  toggleLayerVisibility: (id) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        layers: s.layout.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
      }),
    })),

  toggleLayerLock: (id) =>
    set((s) => ({
      layout: withSave({
        ...s.layout,
        layers: s.layout.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
      }),
    })),

  addGuest: (guest) => {
    const id = newId();
    set((s) => ({ layout: withSave({ ...s.layout, guests: [...s.layout.guests, { ...guest, id }] }) }));
    return id;
  },
  updateGuest: (id, patch) =>
    set((s) => ({ layout: withSave({ ...s.layout, guests: s.layout.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)) }) })),
  deleteGuest: (id) =>
    set((s) => ({ layout: withSave({ ...s.layout, guests: s.layout.guests.filter((g) => g.id !== id) }), selectedGuestId: null })),
  assignGuestToTable: (guestId, tableId, seatNumber) =>
    set((s) => ({ layout: withSave({ ...s.layout, guests: s.layout.guests.map((g) => (g.id === guestId ? { ...g, tableId, seatNumber } : g)) }) })),
  selectGuest: (id) => set({ selectedGuestId: id }),

  addRoom: (room) => {
    const id = newId();
    set((s) => ({ layout: withSave({ ...s.layout, rooms: [...s.layout.rooms, { ...room, id }] }) }));
    return id;
  },
  updateRoom: (id, patch) =>
    set((s) => ({ layout: withSave({ ...s.layout, rooms: s.layout.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }) })),
  deleteRoom: (id) =>
    set((s) => ({ layout: withSave({ ...s.layout, rooms: s.layout.rooms.filter((r) => r.id !== id) }), selectedRoomId: null })),
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

  undo: () =>
    set((s) => {
      if (s.historyIndex < 0) return {};
      return { layout: withSave(s.history[s.historyIndex]), historyIndex: s.historyIndex - 1 };
    }),
  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return {};
      return { layout: withSave(s.history[s.historyIndex + 1]), historyIndex: s.historyIndex + 1 };
    }),
}));
