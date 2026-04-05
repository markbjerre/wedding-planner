import { describe, it, expect } from 'vitest';
import { snapToGrid, snapPosition } from './snap';

describe('snapToGrid', () => {
  it('snaps to nearest increment', () => {
    expect(snapToGrid(23, 10)).toBe(20);
    expect(snapToGrid(27, 10)).toBe(30);
    expect(snapToGrid(0, 5)).toBe(0);
  });
});

describe('snapPosition', () => {
  it('snaps both axes', () => {
    expect(snapPosition(12.3, 45.6, 10)).toEqual({ x: 10, y: 50 });
  });
});
