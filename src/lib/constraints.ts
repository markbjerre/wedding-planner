import type { Layout, VenueShape, BoxEdge, EdgeDistanceConstraint, CanvasLayer, LayerId } from '../types';
import { ALL_LAYER_IDS, SHAPE_DEFAULT_LAYER } from '../types';

function ensureShapeLayer(shape: VenueShape): VenueShape {
  if (ALL_LAYER_IDS.includes(shape.layer as LayerId)) return shape;
  return { ...shape, layer: SHAPE_DEFAULT_LAYER[shape.kind] ?? 'tables' };
}

/** Round table + pillar are drawn as circles with r = min(w,h)/2; edges must use that radius, not the full rect. */
function isCircleLikeShape(s: VenueShape): boolean {
  return s.kind === 'round-table' || s.kind === 'pillar';
}

/** Distance from centre to east/west face (for gap math & bbox). */
export function shapeHalfExtentX(s: VenueShape): number {
  return isCircleLikeShape(s) ? Math.min(s.width, s.height) / 2 : s.width / 2;
}

/** Distance from centre to north/south face. */
export function shapeHalfExtentY(s: VenueShape): number {
  return isCircleLikeShape(s) ? Math.min(s.width, s.height) / 2 : s.height / 2;
}

/** Axis-aligned bbox (rotation ignored). Circle-like kinds use circumscribed square of the rendered circle. */
export function shapeBbox(s: VenueShape) {
  const hx = shapeHalfExtentX(s);
  const hy = shapeHalfExtentY(s);
  return {
    left: s.x - hx,
    right: s.x + hx,
    top: s.y - hy,
    bottom: s.y + hy,
  };
}

/** E↔W constraints fix horizontal gap → driven shape B cannot move along X. */
export function isHorizontalConstraintPair(edgeA: BoxEdge, edgeB: BoxEdge): boolean {
  return (
    (edgeA === 'east' || edgeA === 'west') &&
    (edgeB === 'east' || edgeB === 'west')
  );
}

/** N↔S constraints fix vertical gap → driven shape B cannot move along Y. */
export function isVerticalConstraintPair(edgeA: BoxEdge, edgeB: BoxEdge): boolean {
  return (
    (edgeA === 'north' || edgeA === 'south') &&
    (edgeB === 'north' || edgeB === 'south')
  );
}

/** Valid pairs: horizontal (east↔west) or vertical (south↔north). */
export function isValidEdgePair(edgeA: BoxEdge, edgeB: BoxEdge): boolean {
  return (
    isHorizontalConstraintPair(edgeA, edgeB) || isVerticalConstraintPair(edgeA, edgeB)
  );
}

/**
 * For edge-distance locks, shape B is driven: horizontal gap locks X, vertical gap locks Y.
 */
export function drivenAxesLocked(
  shapeId: string,
  constraints: EdgeDistanceConstraint[]
): { lockX: boolean; lockY: boolean } {
  let lockX = false;
  let lockY = false;
  for (const c of constraints) {
    if (c.shapeBId !== shapeId) continue;
    if (isHorizontalConstraintPair(c.edgeA, c.edgeB)) lockX = true;
    if (isVerticalConstraintPair(c.edgeA, c.edgeB)) lockY = true;
  }
  return { lockX, lockY };
}

/** Signed gap in px along the constraint axis (positive = expected facing orientation). */
export function gapPxBetweenEdges(
  a: VenueShape,
  b: VenueShape,
  edgeA: BoxEdge,
  edgeB: BoxEdge
): number | null {
  const ba = shapeBbox(a);
  const bb = shapeBbox(b);
  if (edgeA === 'east' && edgeB === 'west') return bb.left - ba.right;
  if (edgeA === 'west' && edgeB === 'east') return ba.left - bb.right;
  if (edgeA === 'south' && edgeB === 'north') return bb.top - ba.bottom;
  if (edgeA === 'north' && edgeB === 'south') return ba.top - bb.bottom;
  return null;
}

/**
 * Position for shape B so the gap between A's edgeA and B's edgeB equals distancePx.
 * Returns null if the edge pair is invalid.
 */
export function solveDrivenPosition(
  shapeA: VenueShape,
  shapeB: VenueShape,
  edgeA: BoxEdge,
  edgeB: BoxEdge,
  distancePx: number
): { x: number; y: number } | null {
  const ba = shapeBbox(shapeA);
  let x = shapeB.x;
  let y = shapeB.y;

  if (edgeA === 'east' && edgeB === 'west') {
    x = ba.right + distancePx + shapeHalfExtentX(shapeB);
  } else if (edgeA === 'west' && edgeB === 'east') {
    x = ba.left - distancePx - shapeHalfExtentX(shapeB);
  } else if (edgeA === 'south' && edgeB === 'north') {
    y = ba.bottom + distancePx + shapeHalfExtentY(shapeB);
  } else if (edgeA === 'north' && edgeB === 'south') {
    y = ba.top - distancePx - shapeHalfExtentY(shapeB);
  } else {
    return null;
  }
  return { x, y };
}

/** Venue bounds: origin top-left (0,0), size in px — matches EditorCanvas venue Rect. */
export function venueBboxPx(layout: Layout) {
  const w = layout.venueWidthM * layout.scale;
  const h = layout.venueHeightM * layout.scale;
  return { left: 0, right: w, top: 0, bottom: h, width: w, height: h };
}

/** Y shared by horizontal dimension lines (perpendicular to gap axis). */
function yRefForHorizontalOverlay(
  a: VenueShape | null,
  b: VenueShape,
  bb: ReturnType<typeof shapeBbox>,
  venueH: number
): number {
  if (a === null) {
    return Math.max(0, Math.min(venueH, b.y));
  }
  const ba = shapeBbox(a);
  const top = Math.max(ba.top, bb.top);
  const bottom = Math.min(ba.bottom, bb.bottom);
  if (top < bottom) return (top + bottom) / 2;
  // No vertical overlap: place the horizontal dimension between the two boxes (not at B's centre),
  // so the line reads as connecting the two features (e.g. wall above, pillar below).
  if (bb.bottom < ba.top) {
    return (bb.bottom + ba.top) / 2;
  }
  if (ba.bottom < bb.top) {
    return (ba.bottom + bb.top) / 2;
  }
  return b.y;
}

/** X shared by vertical dimension lines. */
function xRefForVerticalOverlay(
  a: VenueShape | null,
  b: VenueShape,
  bb: ReturnType<typeof shapeBbox>,
  venueW: number
): number {
  if (a === null) {
    return Math.max(0, Math.min(venueW, b.x));
  }
  const ba = shapeBbox(a);
  const left = Math.max(ba.left, bb.left);
  const right = Math.min(ba.right, bb.right);
  if (left < right) return (left + right) / 2;
  // No horizontal overlap: place between the two boxes on X.
  if (bb.right < ba.left) {
    return (bb.right + ba.left) / 2;
  }
  if (ba.right < bb.left) {
    return (ba.right + bb.left) / 2;
  }
  return b.x;
}

/**
 * Y for horizontal dimension lines. Circles must use centre Y so the line meets the circle at 3/9 o'clock,
 * not the top/bottom corners of the square bbox (which sit off the arc).
 */
function yRefForHorizontalDimensionLine(
  a: VenueShape | null,
  b: VenueShape,
  bb: ReturnType<typeof shapeBbox>,
  venueH: number
): number {
  const base = yRefForHorizontalOverlay(a, b, bb, venueH);
  const circleB = isCircleLikeShape(b);
  const circleA = a !== null && isCircleLikeShape(a);

  if (!circleA && !circleB) return base;

  if (circleB && !circleA) {
    if (a === null) {
      return Math.max(0, Math.min(venueH, b.y));
    }
    // Always through circle B's centre. Bbox overlap [lo,hi] can exclude b.y while bboxes still overlap,
    // which used to snap the line to top/bottom tangents.
    return b.y;
  }

  if (circleA && !circleB && a) {
    return a.y;
  }

  if (circleA && circleB && a) {
    return (a.y + b.y) / 2;
  }

  return base;
}

/**
 * X for vertical dimension lines. Circles use centre X so the line meets the circle at 12/6 o'clock.
 */
function xRefForVerticalDimensionLine(
  a: VenueShape | null,
  b: VenueShape,
  bb: ReturnType<typeof shapeBbox>,
  venueW: number
): number {
  const base = xRefForVerticalOverlay(a, b, bb, venueW);
  const circleB = isCircleLikeShape(b);
  const circleA = a !== null && isCircleLikeShape(a);

  if (!circleA && !circleB) return base;

  if (circleB && !circleA) {
    if (a === null) {
      return Math.max(0, Math.min(venueW, b.x));
    }
    // Always through circle B's centre; overlap [lo,hi] can exclude b.x and snap to left/right tangents.
    return b.x;
  }

  if (circleA && !circleB && a) {
    return a.x;
  }

  if (circleA && circleB && a) {
    return (a.x + b.x) / 2;
  }

  return base;
}

/**
 * Axis-aligned segment for drawing: gap runs along x (horizontal) or y (vertical);
 * line is perpendicular so its length matches the gap in px (matches distanceM × scale when satisfied).
 */
export function constraintOverlayEndpoints(
  c: EdgeDistanceConstraint,
  shapes: VenueShape[],
  venueW: number,
  venueH: number
): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
  const b = shapes.find((s) => s.id === c.shapeBId);
  if (!b) return null;
  const bb = shapeBbox(b);
  const a = c.shapeAId ? shapes.find((s) => s.id === c.shapeAId) ?? null : null;

  const ea = c.edgeA;
  const eb = c.edgeB;
  const isH =
    (ea === 'east' || ea === 'west') && (eb === 'east' || eb === 'west');
  const isV =
    (ea === 'north' || ea === 'south') && (eb === 'north' || eb === 'south');

  if (isH) {
    const yRef = yRefForHorizontalDimensionLine(a, b, bb, venueH);
    let x1: number;
    if (a === null) {
      x1 = ea === 'west' ? 0 : venueW;
    } else {
      const ba = shapeBbox(a);
      x1 = ea === 'west' ? ba.left : ba.right;
    }
    const x2 = eb === 'west' ? bb.left : bb.right;
    return { p1: { x: x1, y: yRef }, p2: { x: x2, y: yRef } };
  }

  if (isV) {
    const xRef = xRefForVerticalDimensionLine(a, b, bb, venueW);
    let y1: number;
    if (a === null) {
      y1 = ea === 'north' ? 0 : venueH;
    } else {
      const ba = shapeBbox(a);
      y1 = ea === 'north' ? ba.top : ba.bottom;
    }
    const y2 = eb === 'north' ? bb.top : bb.bottom;
    return { p1: { x: xRef, y: y1 }, p2: { x: xRef, y: y2 } };
  }

  return null;
}

/** Current gap in px between a venue wall and a shape edge. */
export function gapPxRoomToShape(
  venueWidthPx: number,
  venueHeightPx: number,
  roomEdge: BoxEdge,
  shapeB: VenueShape,
  edgeB: BoxEdge
): number | null {
  const bb = shapeBbox(shapeB);
  const W = venueWidthPx;
  const H = venueHeightPx;
  if (roomEdge === 'west' && edgeB === 'east') return bb.right - 0;
  if (roomEdge === 'west' && edgeB === 'west') return bb.left - 0;
  if (roomEdge === 'east' && edgeB === 'west') return W - bb.left;
  if (roomEdge === 'east' && edgeB === 'east') return W - bb.right;
  if (roomEdge === 'north' && edgeB === 'south') return bb.bottom - 0;
  if (roomEdge === 'north' && edgeB === 'north') return bb.top - 0;
  if (roomEdge === 'south' && edgeB === 'north') return H - bb.top;
  if (roomEdge === 'south' && edgeB === 'south') return H - bb.bottom;
  return null;
}

/**
 * Move shape B so gap between venue wall (roomEdge) and B's edgeB equals distancePx.
 */
export function solveDrivenPositionVenue(
  venueWidthPx: number,
  venueHeightPx: number,
  roomEdge: BoxEdge,
  shapeB: VenueShape,
  edgeB: BoxEdge,
  distancePx: number
): { x: number; y: number } | null {
  const W = venueWidthPx;
  const H = venueHeightPx;
  const hx = shapeHalfExtentX(shapeB);
  const hy = shapeHalfExtentY(shapeB);
  let x = shapeB.x;
  let y = shapeB.y;

  if (roomEdge === 'west' && edgeB === 'east') {
    x = distancePx - hx;
  } else if (roomEdge === 'west' && edgeB === 'west') {
    x = distancePx + hx;
  } else if (roomEdge === 'east' && edgeB === 'west') {
    x = W - distancePx - hx;
  } else if (roomEdge === 'east' && edgeB === 'east') {
    x = W - distancePx + hx;
  } else if (roomEdge === 'north' && edgeB === 'south') {
    y = distancePx - hy;
  } else if (roomEdge === 'north' && edgeB === 'north') {
    y = distancePx + hy;
  } else if (roomEdge === 'south' && edgeB === 'north') {
    y = H - distancePx - hy;
  } else if (roomEdge === 'south' && edgeB === 'south') {
    y = H - distancePx + hy;
  } else {
    return null;
  }
  return { x, y };
}

function layerLockedMap(layers: CanvasLayer[]): Record<string, boolean> {
  return Object.fromEntries(layers.map((l) => [l.id, l.locked]));
}

function canMoveShape(shape: VenueShape, layerLocked: Record<string, boolean>): boolean {
  if (shape.locked) return false;
  if (layerLocked[shape.layer]) return false;
  return true;
}

/** Apply one constraint: move shape B only. */
export function applyConstraint(
  shapes: VenueShape[],
  c: EdgeDistanceConstraint,
  layout: Layout,
  layerLocked: Record<string, boolean>
): VenueShape[] {
  const b = shapes.find((s) => s.id === c.shapeBId);
  if (!b || !canMoveShape(b, layerLocked)) return shapes;

  const scale = layout.scale;
  const distancePx = c.distanceM * scale;
  const { width: vw, height: vh } = venueBboxPx(layout);

  let pos: { x: number; y: number } | null;

  if (c.shapeAId === null) {
    pos = solveDrivenPositionVenue(vw, vh, c.edgeA, b, c.edgeB, distancePx);
  } else {
    const a = shapes.find((s) => s.id === c.shapeAId);
    if (!a) return shapes;
    pos = solveDrivenPosition(a, b, c.edgeA, c.edgeB, distancePx);
  }
  if (!pos) return shapes;

  return shapes.map((s) => (s.id === c.shapeBId ? { ...s, x: pos.x, y: pos.y } : s));
}

/**
 * Re-apply all edge-distance constraints (shape B is driven; order = last wins for overlapping B).
 */
export function satisfyConstraintsAfterMove(layout: Layout): Layout {
  let shapes = [...layout.shapes];
  const layerLocked = layerLockedMap(layout.layers);

  for (const c of layout.constraints) {
    shapes = applyConstraint(shapes, c, layout, layerLocked);
  }
  return { ...layout, shapes };
}

export function constraintsReferencingShape(constraints: EdgeDistanceConstraint[], shapeId: string): EdgeDistanceConstraint[] {
  return constraints.filter(
    (c) => (c.shapeAId !== null && c.shapeAId === shapeId) || c.shapeBId === shapeId
  );
}

export function removeConstraintsForShape(constraints: EdgeDistanceConstraint[], shapeId: string): EdgeDistanceConstraint[] {
  return constraints.filter(
    (c) => (c.shapeAId === null || c.shapeAId !== shapeId) && c.shapeBId !== shapeId
  );
}

/** Ensure layouts loaded from older JSON have `constraints` and valid shape layers. */
export function normalizeLayout(layout: Layout): Layout {
  return {
    ...layout,
    constraints: Array.isArray(layout.constraints) ? layout.constraints : [],
    shapes: layout.shapes.map(ensureShapeLayer),
  };
}
