import type { Layout, VenueShape } from '../types';
import { DEFAULT_LAYERS } from '../types';
import { applyAccommodationSeed } from '../lib/applyAccommodation';
import {
  KOSTALD_DANCE_FLOOR_FIRST_ROW,
  KOSTALD_DEPOT,
  KOSTALD_KITCHEN,
  KOSTALD_MEASURED,
  KOSTALD_PILLAR_MODULE,
  kostaldDividerYM,
  kostaldHallCanvasLengthM,
  kostaldPillarCentresM,
  kostaldPillarXM,
  kostaldPillarYM,
} from './kostald-venue';

const SCALE = 40;
const HALL_TOP_M = KOSTALD_KITCHEN.depthM;
const m = (metres: number): number => metres * SCALE;

function zone(
  id: string,
  label: string,
  xM: number,
  yM: number,
  wM: number,
  hM: number,
  color: string,
  zIndex: number,
  locked = true
): VenueShape {
  return {
    id,
    kind: 'zone',
    layer: 'floorplan',
    x: m(xM),
    y: m(yM),
    width: m(wM),
    height: m(hM),
    rotation: 0,
    label,
    color,
    seats: 0,
    locked,
    zIndex,
  };
}

function buildKostaldShapes(): VenueShape[] {
  const w = KOSTALD_MEASURED.outerWidthM;
  const hallH = kostaldHallCanvasLengthM();
  const shapes: VenueShape[] = [];
  let z = 0;

  shapes.push(
    zone('zone-kitchen', 'KØKKEN', 0, 0, w, KOSTALD_KITCHEN.depthM, '#fef3c7', z++),
    zone('zone-hall', 'FORSAMLINGSRUM', 0, HALL_TOP_M, w, hallH, '#f5f0e8', z++, false),
    zone(
      'zone-depot-l',
      'DEPOT',
      KOSTALD_DEPOT.insetM,
      HALL_TOP_M + KOSTALD_DEPOT.insetM,
      KOSTALD_DEPOT.widthM,
      KOSTALD_DEPOT.depthM,
      '#e7e5e4',
      z++
    ),
    zone(
      'zone-depot-r',
      'DEPOT',
      w - KOSTALD_DEPOT.insetM - KOSTALD_DEPOT.widthM,
      HALL_TOP_M + KOSTALD_DEPOT.insetM,
      KOSTALD_DEPOT.widthM,
      KOSTALD_DEPOT.depthM,
      '#e7e5e4',
      z++
    )
  );

  shapes.push({
    id: 'zone-divider',
    kind: 'zone',
    layer: 'floorplan',
    x: 0,
    y: m(HALL_TOP_M + kostaldDividerYM()),
    width: m(w),
    height: m(0.15),
    rotation: 0,
    label: '',
    color: '#d6d3d1',
    seats: 0,
    locked: true,
    zIndex: z++,
  });

  const danceXM = kostaldPillarXM(0);
  const danceYM = HALL_TOP_M + kostaldPillarYM(KOSTALD_DANCE_FLOOR_FIRST_ROW);
  shapes.push({
    id: 'dance-1',
    kind: 'dance-floor',
    layer: 'fixed',
    x: m(danceXM),
    y: m(danceYM),
    width: m(KOSTALD_PILLAR_MODULE.spacingM * 2),
    height: m(KOSTALD_PILLAR_MODULE.spacingM * 2),
    rotation: 0,
    label: 'Dance floor',
    color: '#1c4966',
    seats: 0,
    locked: false,
    zIndex: z++,
  });

  const half = KOSTALD_PILLAR_MODULE.pillarSizeM / 2;
  for (let i = 0; i < kostaldPillarCentresM().length; i++) {
    const { x, y } = kostaldPillarCentresM()[i]!;
    shapes.push({
      id: `pillar-${i + 1}`,
      kind: 'pillar',
      layer: 'fixed',
      x: m(x - half),
      y: m(HALL_TOP_M + y - half),
      width: m(KOSTALD_PILLAR_MODULE.pillarSizeM),
      height: m(KOSTALD_PILLAR_MODULE.pillarSizeM),
      rotation: 0,
      label: '',
      color: '#64748b',
      seats: 0,
      locked: true,
      zIndex: z++,
    });
  }

  return shapes;
}

function buildKostaldBaseLayout(): Layout {
  const now = new Date().toISOString();
  const canvasH = HALL_TOP_M + kostaldHallCanvasLengthM();
  return {
    id: 'kostald',
    name: 'Kostald — Forsamlingsrum',
    venueName: 'Kostald (Grønnessegaard)',
    venueWidthM: KOSTALD_MEASURED.outerWidthM,
    venueHeightM: canvasH,
    gridSizeM: 1,
    scale: SCALE,
    version: 1,
    createdAt: now,
    updatedAt: now,
    layers: DEFAULT_LAYERS,
    constraints: [],
    shapes: buildKostaldShapes(),
    guests: [],
    rooms: [],
  };
}

export const KOSTALD_LAYOUT: Layout = applyAccommodationSeed(buildKostaldBaseLayout());

export { buildKostaldShapes, buildKostaldBaseLayout };
