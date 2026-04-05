import { describe, expect, it } from 'vitest';
import { mergeLayoutPatch, parseLayoutFromJsonText, getAtPath } from './layoutMerge';
import { SAMPLE_LAYOUT } from '../data/sample-layout';

describe('parseLayoutFromJsonText', () => {
  it('parses and normalizes sample layout', () => {
    const text = JSON.stringify(SAMPLE_LAYOUT);
    const l = parseLayoutFromJsonText(text);
    expect(l.id).toBe('demo');
    expect(l.constraints).toEqual([]);
    expect(Array.isArray(l.shapes)).toBe(true);
  });

  it('rejects invalid root', () => {
    expect(() => parseLayoutFromJsonText('[]')).toThrow();
  });
});

describe('mergeLayoutPatch', () => {
  it('applies venue name and keeps shapes when omitted', () => {
    const next = mergeLayoutPatch(SAMPLE_LAYOUT, { venueName: 'New Venue' });
    expect(next.venueName).toBe('New Venue');
    expect(next.shapes.length).toBe(SAMPLE_LAYOUT.shapes.length);
  });
});

describe('getAtPath', () => {
  it('reads nested keys', () => {
    expect(getAtPath(SAMPLE_LAYOUT, 'venueName')).toBe(SAMPLE_LAYOUT.venueName);
    expect(getAtPath(SAMPLE_LAYOUT, 'guests.0.name')).toBe(SAMPLE_LAYOUT.guests[0]?.name);
  });
});
