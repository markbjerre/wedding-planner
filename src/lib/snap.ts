/** Snap a value to the nearest grid increment. */
export const snapToGrid = (value: number, gridSize: number): number =>
  Math.round(value / gridSize) * gridSize;

/** Snap both x and y of a position. */
export const snapPosition = (
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } => ({
  x: snapToGrid(x, gridSize),
  y: snapToGrid(y, gridSize),
});
