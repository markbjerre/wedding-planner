import { describe, expect, it } from 'vitest';
import {
  KOSTALD_DANCE_FLOOR_FIRST_ROW,
  KOSTALD_MEASURED,
  KOSTALD_PILLAR_MODULE,
  kostaldDepotBottomM,
  kostaldDividerYM,
  kostaldHallCanvasLengthM,
  kostaldHallClearSegmentsM,
  kostaldDimensionDiscrepancies,
  kostaldPillarCentresM,
  kostaldPillarXM,
  kostaldPillarYM,
  hasMajorKostaldDiscrepancy,
} from './kostald-venue';
import { KOSTALD_LAYOUT, buildKostaldShapes } from './kostald-layout';

describe('kostald-venue constants', () => {
  it('uses 13.6 m width and 24 m clear hall length', () => {
    expect(KOSTALD_MEASURED.outerWidthM).toBe(13.6);
    expect(KOSTALD_MEASURED.hallClearLengthM).toBe(24);
    expect(kostaldHallCanvasLengthM()).toBeCloseTo(28.2, 5);
  });

  it('pillar bay matches 2.8 + 4 + 4 + 2.8', () => {
    const span =
      KOSTALD_PILLAR_MODULE.insetFromBayLeftM +
      KOSTALD_PILLAR_MODULE.spacingM * 2 +
      KOSTALD_PILLAR_MODULE.insetFromBayLeftM;
    expect(span).toBeCloseTo(KOSTALD_MEASURED.pillarBayWidthM, 5);
  });

  it('clear hall is six 4 m segments (5 pillar rows)', () => {
    const segments = kostaldHallClearSegmentsM();
    expect(segments).toHaveLength(6);
    expect(segments.every((s) => s === 4)).toBe(true);
    expect(segments.reduce((a, b) => a + b, 0)).toBeCloseTo(24, 5);
    expect(kostaldDepotBottomM() + 24).toBeCloseTo(kostaldDividerYM(), 5);
  });

  it('has 5×3 pillar centres', () => {
    expect(kostaldPillarCentresM()).toHaveLength(15);
    expect(kostaldPillarXM(0)).toBeCloseTo(2.8, 2);
    expect(kostaldPillarXM(2)).toBeCloseTo(10.8, 2);
    expect(kostaldPillarYM(0)).toBeCloseTo(8.2, 2);
    expect(kostaldPillarYM(4)).toBeCloseTo(24.2, 2);
  });

  it('dance floor starts at pillar row 2 (16.2 m)', () => {
    expect(KOSTALD_DANCE_FLOOR_FIRST_ROW).toBe(2);
    expect(kostaldPillarYM(KOSTALD_DANCE_FLOOR_FIRST_ROW)).toBeCloseTo(16.2, 2);
  });

  it('flags major sketch vs PDF length discrepancy', () => {
    expect(hasMajorKostaldDiscrepancy()).toBe(true);
    const lengthDisc = kostaldDimensionDiscrepancies().find(
      (d) => d.field === 'totalBuildingLengthM'
    );
    expect(lengthDisc?.deltaPct).toBeGreaterThan(15);
  });
});

describe('KOSTALD_LAYOUT', () => {
  it('uses hall canvas including kitchen stack', () => {
    expect(KOSTALD_LAYOUT.venueWidthM).toBe(13.6);
    expect(KOSTALD_LAYOUT.venueHeightM).toBeCloseTo(7.03 + 28.2, 1);
    expect(KOSTALD_LAYOUT.venueName).toContain('Kostald');
  });

  it('includes 15 pillars, kitchen, depots, accommodation', () => {
    const pillars = KOSTALD_LAYOUT.shapes.filter((s) => s.kind === 'pillar');
    expect(pillars).toHaveLength(15);
    expect(KOSTALD_LAYOUT.shapes.some((s) => s.id === 'zone-kitchen')).toBe(true);
    expect(KOSTALD_LAYOUT.shapes.filter((s) => s.id.startsWith('zone-depot'))).toHaveLength(2);
    expect(KOSTALD_LAYOUT.rooms.length).toBeGreaterThanOrEqual(26);
  });

  it('pillar positions in px match metre module at scale 40', () => {
    const scale = KOSTALD_LAYOUT.scale;
    const first = KOSTALD_LAYOUT.shapes.find((s) => s.id === 'pillar-1');
    expect(first).toBeDefined();
    const cx = (first!.x + first!.width / 2) / scale;
    const cy = (first!.y + first!.height / 2) / scale;
    expect(cx).toBeCloseTo(kostaldPillarXM(0), 2);
    expect(cy).toBeCloseTo(7.03 + kostaldPillarYM(0), 2);
  });

  it('hall zone spans through divider', () => {
    const hall = buildKostaldShapes().find((s) => s.id === 'zone-hall');
    expect(hall).toBeDefined();
    const scale = KOSTALD_LAYOUT.scale;
    expect(hall!.width / scale).toBeCloseTo(KOSTALD_MEASURED.outerWidthM, 1);
    expect(hall!.height / scale).toBeCloseTo(kostaldHallCanvasLengthM(), 1);
  });
});
