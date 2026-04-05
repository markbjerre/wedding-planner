import { describe, it, expect } from 'vitest';
import { isValidEdgePair, isHorizontalConstraintPair } from './constraints';

describe('constraints edge pairs', () => {
  it('allows opposite horizontal (east–west) edges', () => {
    expect(isValidEdgePair('east', 'west')).toBe(true);
    expect(isHorizontalConstraintPair('east', 'west')).toBe(true);
  });

  it('allows opposite vertical (north–south) edges', () => {
    expect(isValidEdgePair('north', 'south')).toBe(true);
  });

  it('rejects mixed-axis pairs', () => {
    expect(isValidEdgePair('north', 'east')).toBe(false);
    expect(isValidEdgePair('west', 'south')).toBe(false);
  });
});
