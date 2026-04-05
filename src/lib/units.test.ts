import { describe, it, expect } from 'vitest';
import {
  pxToMetres,
  metresToPx,
  parseCmStringToPx,
  isInvalidCmDraft,
} from './units';

describe('units', () => {
  it('converts px and metres', () => {
    expect(pxToMetres(40, 400)).toBe(10);
    expect(metresToPx(40, 10)).toBe(400);
  });

  it('parses cm string to px', () => {
    expect(parseCmStringToPx(40, '100')).toBe(40);
    expect(parseCmStringToPx(40, '50,5')).toBeCloseTo(20.2, 5);
    expect(parseCmStringToPx(40, '')).toBeNull();
  });

  it('detects invalid draft', () => {
    expect(isInvalidCmDraft(40, null)).toBe(false);
    expect(isInvalidCmDraft(40, 'abc')).toBe(true);
  });
});
