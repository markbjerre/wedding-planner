import type { VenueShape } from '../types';
import { shapeBbox } from './constraints';

export const MIN_SPACING_PX = 20; // minimum gap between shapes in pixels

/** Gap between two AABBs (negative means overlap). */
export function shapesGapPx(a: VenueShape, b: VenueShape): number {
  const ba = shapeBbox(a);
  const bb = shapeBbox(b);
  const gapX = Math.max(ba.left, bb.left) - Math.min(ba.right, bb.right);
  const gapY = Math.max(ba.top, bb.top) - Math.min(ba.bottom, bb.bottom);
  // If they overlap on one axis, the gap on the other axis is what matters
  if (gapX < 0 && gapY < 0) return Math.max(gapX, gapY); // overlap
  if (gapX < 0) return gapY;
  if (gapY < 0) return gapX;
  return Math.sqrt(gapX * gapX + gapY * gapY);
}

/** Distance in px between centres. */
export function centreDistancePx(a: VenueShape, b: VenueShape): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/** Returns pairs of shapes that violate MIN_SPACING_PX. */
export function findSpacingViolations(
  shapes: VenueShape[],
  minGap = MIN_SPACING_PX
): Array<[VenueShape, VenueShape]> {
  const violations: Array<[VenueShape, VenueShape]> = [];
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      if (shapesGapPx(shapes[i], shapes[j]) < minGap) {
        violations.push([shapes[i], shapes[j]]);
      }
    }
  }
  return violations;
}
