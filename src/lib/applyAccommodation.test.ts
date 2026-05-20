import { describe, expect, it } from 'vitest';
import { SAMPLE_LAYOUT } from '../data/sample-layout';
import { ACCOMMODATION_ROOMS } from '../data/accommodation-seed';
import { applyAccommodationSeed } from './applyAccommodation';

describe('applyAccommodationSeed', () => {
  it('creates all accommodation rooms with assigned guests', () => {
    const result = applyAccommodationSeed(SAMPLE_LAYOUT);

    expect(result.rooms).toHaveLength(ACCOMMODATION_ROOMS.length);

    const hb1 = result.rooms.find((r) => r.id === 'hb-r1');
    expect(hb1?.guestIds).toHaveLength(2);
    const hb1Guests = hb1!.guestIds.map((id) => result.guests.find((g) => g.id === id)?.name);
    expect(hb1Guests).toEqual(expect.arrayContaining(['Ella', 'Mark']));

    const tent13 = result.rooms.find((r) => r.id === 'gt-13');
    const mathilde = result.guests.find((g) => g.name === 'Mathilde');
    expect(tent13?.guestIds).toContain(mathilde?.id);
    expect(mathilde?.notes).toContain('???');

    const assignedIds = new Set(result.rooms.flatMap((r) => r.guestIds));
    expect(assignedIds.size).toBeGreaterThanOrEqual(45);
  });

  it('preserves canvas shapes', () => {
    const result = applyAccommodationSeed(SAMPLE_LAYOUT);
    expect(result.shapes).toEqual(SAMPLE_LAYOUT.shapes);
  });
});
