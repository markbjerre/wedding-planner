import type { Layout } from '../types';
import { DEFAULT_LAYERS } from '../types';

export const SAMPLE_LAYOUT: Layout = {
  id: 'demo',
  name: 'My Wedding Layout',
  venueName: 'The Grand Hall',
  venueWidthM: 24,
  venueHeightM: 16,
  gridSizeM: 1,
  scale: 40,  // 40px = 1 metre
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  layers: DEFAULT_LAYERS,
  shapes: [
    { id: 'stage-1', kind: 'stage', layer: 'fixed', x: 480, y: 80, width: 480, height: 100, rotation: 0, label: 'Stage', color: '#57534e', seats: 0, locked: true, zIndex: 0 },
    { id: 'dance-1', kind: 'dance-floor', layer: 'fixed', x: 480, y: 240, width: 360, height: 280, rotation: 0, label: 'Dance Floor', color: '#1c4966', seats: 0, locked: false, zIndex: 1 },
    { id: 't1', kind: 'round-table', layer: 'tables', x: 160, y: 280, width: 120, height: 120, rotation: 0, label: 'Table 1', color: '#92400e', seats: 8, locked: false, zIndex: 2 },
    { id: 't2', kind: 'round-table', layer: 'tables', x: 320, y: 280, width: 120, height: 120, rotation: 0, label: 'Table 2', color: '#92400e', seats: 8, locked: false, zIndex: 3 },
    { id: 't3', kind: 'round-table', layer: 'tables', x: 160, y: 480, width: 120, height: 120, rotation: 0, label: 'Table 3', color: '#92400e', seats: 8, locked: false, zIndex: 4 },
    { id: 't4', kind: 'round-table', layer: 'tables', x: 320, y: 480, width: 120, height: 120, rotation: 0, label: 'Table 4', color: '#92400e', seats: 8, locked: false, zIndex: 5 },
    { id: 't5', kind: 'rect-table', layer: 'tables', x: 760, y: 480, width: 200, height: 80, rotation: 0, label: 'Family Table', color: '#7c3aed', seats: 10, locked: false, zIndex: 6 },
    { id: 'bar-1', kind: 'zone', layer: 'fixed', x: 800, y: 120, width: 120, height: 80, rotation: 0, label: 'Bar', color: '#854d0e', seats: 0, locked: true, zIndex: 7 },
    { id: 'dec-1', kind: 'decoration', layer: 'decorations', x: 120, y: 120, width: 60, height: 60, rotation: 0, label: 'Flowers', color: '#be185d', seats: 0, locked: false, zIndex: 8 },
  ],
  guests: [
    { id: 'g1', name: 'Anna Jensen', email: 'anna@example.com', phone: '', status: 'confirmed', group: 'bride', dietary: 'none', tableId: 't1', seatNumber: 1, notes: '', plusOne: false, plusOneName: '', plusOneTableId: null, plusOneSeatNumber: null },
    { id: 'g2', name: 'Lars Nielsen', email: 'lars@example.com', phone: '', status: 'confirmed', group: 'groom', dietary: 'vegetarian', tableId: 't1', seatNumber: 2, notes: '', plusOne: false, plusOneName: '', plusOneTableId: null, plusOneSeatNumber: null },
    { id: 'g3', name: 'Sofia Andersen', email: '', phone: '', status: 'invited', group: 'family', dietary: 'vegan', tableId: null, seatNumber: null, notes: 'Nut allergy', plusOne: true, plusOneName: 'Peter Andersen', plusOneTableId: null, plusOneSeatNumber: null },
    { id: 'g4', name: 'Mikkel Hansen', email: '', phone: '', status: 'confirmed', group: 'friends', dietary: 'none', tableId: 't2', seatNumber: 1, notes: '', plusOne: false, plusOneName: '', plusOneTableId: null, plusOneSeatNumber: null },
    { id: 'g5', name: 'Camilla Møller', email: '', phone: '', status: 'maybe', group: 'colleagues', dietary: 'gluten-free', tableId: null, seatNumber: null, notes: '', plusOne: false, plusOneName: '', plusOneTableId: null, plusOneSeatNumber: null },
  ],
  rooms: [
    { id: 'r1', name: 'Bridal Suite', type: 'bridal-suite', capacity: 2, guestIds: ['g1', 'g2'], notes: 'Main couple', floor: 1, building: 'Main' },
    { id: 'r2', name: 'Room 101', type: 'bedroom', capacity: 2, guestIds: ['g3'], notes: '', floor: 1, building: 'Main' },
    { id: 'r3', name: 'Room 102', type: 'bedroom', capacity: 2, guestIds: [], notes: '', floor: 1, building: 'Main' },
    { id: 'r4', name: 'Room 201', type: 'suite', capacity: 4, guestIds: [], notes: '', floor: 2, building: 'Main' },
  ],
};
