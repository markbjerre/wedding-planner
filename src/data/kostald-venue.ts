/**
 * Kostald Forsamlingsrum — on-site sketch + Kostald plan (kitchen/depots).
 * Width: 2.8 / 4 / 4 / 2.8 m (13.6 m).
 * Length: 24 m clear hall (depot bottom → divider), 5 pillar rows @ 4 m.
 */
export const KOSTALD_MEASURED = {
  outerWidthM: 13.6,
  /** Depot bottom → rear-room divider line (excludes depots & divider strip). */
  hallClearLengthM: 24,
  pillarBayWidthM: 13.6,
  pillarBayMarginM: 0,
} as const;

export const KOSTALD_KITCHEN = {
  depthM: 7.03,
} as const;

export const KOSTALD_DEPOT = {
  insetM: 0.4,
  widthM: 4.8,
  depthM: 3.8,
} as const;

/** Archived PDF measurements — reference only. */
export const KOSTALD_PDF_MEASURED = {
  outerWidthM: 15.5,
  outerLengthM: 62.85,
  pillarBayWidthM: 13.6,
  pillarBayMarginM: 0.95,
  sections: {
    kitchenM: 7.03,
    depotHallM: 21.51,
    bathroomsM: 5.82,
    midCirculationM: 8.32,
    meetingM: 16.13,
    entranceM: 4.04,
  },
} as const;

export const KOSTALD_PILLAR_MODULE = {
  insetFromBayLeftM: 2.8,
  spacingM: 4,
  /** Depot bottom → first pillar row (4 m for now; target 3.7 m). */
  insetFromDepotBottomM: 4,
  /** Last pillar row → divider line (4 m for now; target 3.7 m). */
  insetFromDividerM: 4,
  rowCount: 5,
  colCount: 3,
  pillarSizeM: 0.36,
} as const;

/** Dance floor spans 2×2 bays; top-left row index (0 = nearest depots). */
export const KOSTALD_DANCE_FLOOR_FIRST_ROW = 2;

export const KOSTALD_REAR_STRIP_DEPTH_M = 3.1;

/** Bottom edge of depot band (m from hall top). */
export function kostaldDepotBottomM(): number {
  return KOSTALD_DEPOT.insetM + KOSTALD_DEPOT.depthM;
}

/** Rear-room divider line (m from hall top). */
export function kostaldDividerYM(): number {
  return kostaldDepotBottomM() + KOSTALD_MEASURED.hallClearLengthM;
}

/** Hall canvas height in app (through divider line). */
export function kostaldHallCanvasLengthM(): number {
  return kostaldDividerYM();
}

export function kostaldPillarXM(colIndex: number): number {
  return (
    KOSTALD_PILLAR_MODULE.insetFromBayLeftM +
    colIndex * KOSTALD_PILLAR_MODULE.spacingM
  );
}

/** Row centre Y (m from hall top). Row 0 nearest depots, row 4 nearest divider. */
export function kostaldPillarYM(rowIndex: number): number {
  return (
    kostaldDepotBottomM() +
    KOSTALD_PILLAR_MODULE.insetFromDepotBottomM +
    rowIndex * KOSTALD_PILLAR_MODULE.spacingM
  );
}

/** Six 4 m segments in the 24 m clear hall (depot bottom → divider). */
export function kostaldHallClearSegmentsM(): number[] {
  const n =
    KOSTALD_PILLAR_MODULE.rowCount +
    1; /* gap above first row + gaps between rows + gap below last row */
  return Array.from({ length: n }, () => KOSTALD_PILLAR_MODULE.spacingM);
}

export interface DimensionDiscrepancy {
  field: string;
  sketchM: number;
  pdfM: number;
  deltaM: number;
  deltaPct: number;
}

const DISCREPANCY_WARN_PCT = 15;

export function kostaldDimensionDiscrepancies(): DimensionDiscrepancy[] {
  const pdf = KOSTALD_PDF_MEASURED;
  const pairs: Array<[string, number, number]> = [
    ['outerWidthM', KOSTALD_MEASURED.outerWidthM, pdf.outerWidthM],
    ['pillarBayWidthM', KOSTALD_MEASURED.pillarBayWidthM, pdf.pillarBayWidthM],
    ['hallClearLengthM', KOSTALD_MEASURED.hallClearLengthM, pdf.sections.depotHallM],
    [
      'totalBuildingLengthM',
      kostaldDividerYM() + KOSTALD_REAR_STRIP_DEPTH_M,
      pdf.outerLengthM,
    ],
  ];
  return pairs.map(([field, sketchM, pdfM]) => {
    const deltaM = pdfM - sketchM;
    const deltaPct = sketchM === 0 ? 0 : (Math.abs(deltaM) / sketchM) * 100;
    return { field, sketchM, pdfM, deltaM, deltaPct };
  });
}

export function hasMajorKostaldDiscrepancy(): boolean {
  return kostaldDimensionDiscrepancies().some((d) => d.deltaPct > DISCREPANCY_WARN_PCT);
}

export function kostaldPillarCentresM(): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < KOSTALD_PILLAR_MODULE.rowCount; r++) {
    for (let c = 0; c < KOSTALD_PILLAR_MODULE.colCount; c++) {
      out.push({ x: kostaldPillarXM(c), y: kostaldPillarYM(r) });
    }
  }
  return out;
}
