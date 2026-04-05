import { describe, it, expect } from 'vitest';
import { formatUserLabel } from './profile';

describe('formatUserLabel', () => {
  it('uses name from map when present', () => {
    const map = { u1: 'Alex' };
    expect(formatUserLabel('u1', map)).toBe('Alex');
  });

  it('falls back to short id', () => {
    const long = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(formatUserLabel(long, {})).toBe('aaaaaaaa…');
  });

  it('keeps short ids', () => {
    expect(formatUserLabel('short', {})).toBe('short');
  });
});
