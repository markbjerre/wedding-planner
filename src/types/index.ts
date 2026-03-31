// ─── Layers ──────────────────────────────────────────────────────────────────

export type LayerId = 'floorplan' | 'fixed' | 'tables' | 'decorations';

export interface CanvasLayer {
  id: LayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export const DEFAULT_LAYERS: CanvasLayer[] = [
  { id: 'floorplan',   name: 'Floorplan',    visible: true, locked: false, color: '#92400e' },
  { id: 'fixed',       name: 'Fixed Items',  visible: true, locked: false, color: '#1e40af' },
  { id: 'tables',      name: 'Tables',       visible: true, locked: false, color: '#065f46' },
  { id: 'decorations', name: 'Decorations',  visible: true, locked: false, color: '#6d28d9' },
];

/** All layer ids in default stack order (for filter defaults). */
export const ALL_LAYER_IDS: LayerId[] = ['floorplan', 'fixed', 'tables', 'decorations'];

// Default layer for each shape kind
export const SHAPE_DEFAULT_LAYER: Record<string, LayerId> = {
  'round-table':  'tables',
  'rect-table':   'tables',
  'chair':        'tables',
  'stage':        'fixed',
  'dance-floor':  'fixed',
  'zone':         'floorplan',
  'decoration':   'decorations',
  'wall':         'floorplan',
  'pillar':       'fixed',
  'door':         'floorplan',
  'item':         'fixed',
};

// ─── Shape types ─────────────────────────────────────────────────────────────

export type ShapeKind =
  | 'round-table'
  | 'rect-table'
  | 'chair'
  | 'stage'
  | 'dance-floor'
  | 'zone'
  | 'decoration'
  | 'wall'
  | 'pillar'
  | 'door'
  | 'item';

export interface VenueShape {
  id: string;
  kind: ShapeKind;
  layer: LayerId;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;           // degrees
  label: string;
  color: string;
  seats: number;              // for tables
  locked: boolean;
  zIndex: number;
}

// ─── Guests ──────────────────────────────────────────────────────────────────

export type DietaryRequirement = 'none' | 'vegetarian' | 'vegan' | 'gluten-free' | 'halal' | 'other';
export type GuestStatus = 'invited' | 'confirmed' | 'declined' | 'maybe';
export type GuestGroup = 'bride' | 'groom' | 'family' | 'friends' | 'colleagues' | 'other';

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: GuestStatus;
  group: GuestGroup;
  dietary: DietaryRequirement;
  tableId: string | null;
  seatNumber: number | null;
  notes: string;
  plusOne: boolean;
  plusOneName: string;
  plusOneTableId: string | null;
  plusOneSeatNumber: number | null;
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export type RoomType = 'bedroom' | 'suite' | 'dorm' | 'bridal-suite' | 'other';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  guestIds: string[];
  notes: string;
  floor: number;
  building: string;
}

// ─── Edge distance constraints (axis-aligned bbox; rotation ignored) ─────────

/** World-space box sides — same convention as spacing.ts AABB. */
export type BoxEdge = 'north' | 'south' | 'east' | 'west';

/** Gap between two AABB edges; shape B is driven (moves to satisfy). Anchor A is a shape or a venue wall. */
export interface EdgeDistanceConstraint {
  id: string;
  /** Anchor shape, or `null` when anchor is a **room/venue edge** (`edgeA` = N/E/S/W wall). */
  shapeAId: string | null;
  edgeA: BoxEdge;
  shapeBId: string;
  edgeB: BoxEdge;
  /** Gap between the two edges in metres. */
  distanceM: number;
}

/** Wizard state for the Dimension tool (Fusion-style edge pick). */
export type DimensionFlowStep = 'pickA' | 'edgeA' | 'pickB' | 'edgeB' | 'value';

export interface DimensionFlowState {
  step: DimensionFlowStep;
  /** True when anchor A is a venue wall (not a shape). */
  anchorAIsRoom: boolean;
  shapeAId: string | null;
  edgeA: BoxEdge | null;
  shapeBId: string | null;
  edgeB: BoxEdge | null;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export interface Layout {
  id: string;
  name: string;
  venueName: string;
  venueWidthM: number;        // metres
  venueHeightM: number;       // metres
  gridSizeM: number;          // grid cell size in metres
  scale: number;              // px per metre (default 40)
  shapes: VenueShape[];
  guests: Guest[];
  rooms: Room[];
  layers: CanvasLayer[];
  constraints: EdgeDistanceConstraint[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ─── Editor UI ───────────────────────────────────────────────────────────────

export type ActiveTool = 'select' | 'dimension' | ShapeKind;
export type AppView = 'editor' | 'guests' | 'rooms';
export type SidebarTab = 'properties' | 'layers' | 'layout';

export interface EditorState {
  layout: Layout;
  selectedShapeId: string | null;
  selectedGuestId: string | null;
  selectedRoomId: string | null;
  activeTool: ActiveTool;
  /** New shapes are placed on this layer. */
  activeLayerId: LayerId;
  /** Which layers’ shapes are drawn on the canvas (multi-select filter). Empty = nothing shown. */
  canvasLayerFilterIds: LayerId[];
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showDistances: boolean;
  snapToGrid: boolean;
  history: Layout[];
  historyIndex: number;
  view: AppView;
  sidebarTab: SidebarTab;
  /** Set when activeTool === 'dimension'. */
  dimensionFlow: DimensionFlowState | null;
  /** Highlights a row in Dimension locks + styles the canvas line. */
  selectedConstraintId: string | null;
}
