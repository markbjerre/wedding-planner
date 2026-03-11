// ─── Shape types ────────────────────────────────────────────────────────────

export type ShapeKind =
  | 'round-table'
  | 'rect-table'
  | 'chair'
  | 'stage'
  | 'dance-floor'
  | 'zone'
  | 'decoration';

export interface VenueShape {
  id: string;
  kind: ShapeKind;
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

// ─── Guests ─────────────────────────────────────────────────────────────────

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
  tableId: string | null;     // assigned venue shape ID
  seatNumber: number | null;  // 1-based seat within table
  notes: string;
  plusOne: boolean;
  plusOneName: string;
  plusOneTableId: string | null;
  plusOneSeatNumber: number | null;
}

// ─── Rooms ──────────────────────────────────────────────────────────────────

export type RoomType = 'bedroom' | 'suite' | 'dorm' | 'bridal-suite' | 'other';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;           // number of guests it can sleep
  guestIds: string[];         // assigned guest IDs
  notes: string;
  floor: number;
  building: string;
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export interface Layout {
  id: string;
  name: string;
  venueName: string;
  venueWidth: number;         // metres (canvas unit = px, scale applied)
  venueHeight: number;
  gridSize: number;           // snap grid cell size in px
  scale: number;              // px per metre for distance display
  shapes: VenueShape[];
  guests: Guest[];
  rooms: Room[];
  createdAt: string;          // ISO date
  updatedAt: string;
  version: number;
}

// ─── Editor UI ──────────────────────────────────────────────────────────────

export type ActiveTool = 'select' | ShapeKind;
export type AppView = 'editor' | 'guests' | 'rooms';

export interface EditorState {
  layout: Layout;
  selectedShapeId: string | null;
  selectedGuestId: string | null;
  selectedRoomId: string | null;
  activeTool: ActiveTool;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showDistances: boolean;
  snapToGrid: boolean;
  history: Layout[];          // undo stack
  historyIndex: number;
  view: AppView;
}
