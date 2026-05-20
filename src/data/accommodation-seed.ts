import type { RoomType } from '../types';

export interface AccommodationSlot {
  name: string;
  /** Payment / account note from the accommodation sheet */
  paid?: string;
}

export interface AccommodationRoomDef {
  id: string;
  building: string;
  name: string;
  type: RoomType;
  capacity: number;
  floor: number;
  notes?: string;
  occupants: AccommodationSlot[];
}

/** Ella & Mark wedding — Grønnessegaard accommodation plan (2026). */
export const ACCOMMODATION_ROOMS: AccommodationRoomDef[] = [
  // ── Hovedbygning ──────────────────────────────────────────────────────────
  {
    id: 'hb-r1',
    building: 'Hovedbygning',
    name: 'Rum 1',
    type: 'bridal-suite',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Ella' }, { name: 'Mark' }],
  },
  {
    id: 'hb-r2',
    building: 'Hovedbygning',
    name: 'Rum 2',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Ester' }, { name: 'Tan' }],
  },
  {
    id: 'hb-r3',
    building: 'Hovedbygning',
    name: 'Rum 3',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Laura' }],
  },
  {
    id: 'hb-r4',
    building: 'Hovedbygning',
    name: 'Rum 4',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Aimo', paid: 'Yes' }, { name: 'Eva', paid: 'Yes' }],
  },
  {
    id: 'hb-r5',
    building: 'Hovedbygning',
    name: 'Rum 5',
    type: 'bedroom',
    capacity: 4,
    floor: 1,
    notes: 'Henry + kids',
    occupants: [{ name: 'Louise', paid: 'Yes' }, { name: 'Henry + kids', paid: 'Yes' }],
  },

  // ── Gæstehuset ────────────────────────────────────────────────────────────
  {
    id: 'gh-r1',
    building: 'Gæstehuset',
    name: 'Rum 1',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Jannie' }, { name: 'Henrik' }],
  },
  {
    id: 'gh-r2',
    building: 'Gæstehuset',
    name: 'Rum 2',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Filippa' }],
  },
  {
    id: 'gh-r3',
    building: 'Gæstehuset',
    name: 'Rum 3',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Anita', paid: 'Yes' }, { name: 'Sten', paid: 'Yes' }],
  },
  {
    id: 'gh-r4',
    building: 'Gæstehuset',
    name: 'Rum 4',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Bjarne', paid: 'Yes' }, { name: 'Winnie', paid: 'Yes' }],
  },
  {
    id: 'gh-r5',
    building: 'Gæstehuset',
    name: 'Rum 5',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Thomas' }, { name: 'Christina' }],
  },
  {
    id: 'gh-r6',
    building: 'Gæstehuset',
    name: 'Rum 6',
    type: 'bedroom',
    capacity: 2,
    floor: 1,
    occupants: [{ name: 'Onkel Jan' }],
  },

  // ── Glamping telte ────────────────────────────────────────────────────────
  {
    id: 'gt-1',
    building: 'Glamping telte',
    name: 'Telt 1',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Jens', paid: 'Yes' }, { name: 'Martine', paid: 'Yes' }],
  },
  {
    id: 'gt-2',
    building: 'Glamping telte',
    name: 'Telt 2',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Astrid', paid: 'Yes' }, { name: 'Morten', paid: 'Yes' }],
  },
  {
    id: 'gt-3',
    building: 'Glamping telte',
    name: 'Telt 3',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Angela' }, { name: 'Asger' }],
  },
  {
    id: 'gt-4',
    building: 'Glamping telte',
    name: 'Telt 4',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Ruchi', paid: 'Yes' }, { name: 'Jakob', paid: 'Yes' }],
  },
  {
    id: 'gt-5',
    building: 'Glamping telte',
    name: 'Telt 5',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Tharanja', paid: 'Yes' }, { name: 'Alex', paid: 'Yes' }],
  },
  {
    id: 'gt-6',
    building: 'Glamping telte',
    name: 'Telt 6',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Sofie' }, { name: 'Bernardo' }],
  },
  {
    id: 'gt-7',
    building: 'Glamping telte',
    name: 'Telt 7',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Lasse' }, { name: 'Stian' }],
  },
  {
    id: 'gt-8',
    building: 'Glamping telte',
    name: 'Telt 8',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [
      { name: 'Vilma', paid: 'Yes (Finnish account)' },
      { name: 'Jenny', paid: 'Yes (Finnish account)' },
    ],
  },
  {
    id: 'gt-9',
    building: 'Glamping telte',
    name: 'Telt 9',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Ida' }, { name: 'Vincent' }],
  },
  {
    id: 'gt-10',
    building: 'Glamping telte',
    name: 'Telt 10',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Kristian' }, { name: 'Thor' }],
  },
  {
    id: 'gt-11',
    building: 'Glamping telte',
    name: 'Telt 11',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Rune', paid: 'Yes' }, { name: 'Mette', paid: 'Yes' }],
  },
  {
    id: 'gt-12',
    building: 'Glamping telte',
    name: 'Telt 12',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Kata' }, { name: 'Hasan' }],
  },
  {
    id: 'gt-13',
    building: 'Glamping telte',
    name: 'Telt 13',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Karen' }, { name: 'Mathilde', paid: '???' }],
  },
  {
    id: 'gt-14',
    building: 'Glamping telte',
    name: 'Telt 14',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Aino' }, { name: 'Micheal' }],
  },
  {
    id: 'gt-15',
    building: 'Glamping telte',
    name: 'Telt 15',
    type: 'other',
    capacity: 2,
    floor: 0,
    occupants: [{ name: 'Anna' }, { name: 'Jose' }],
  },
];
