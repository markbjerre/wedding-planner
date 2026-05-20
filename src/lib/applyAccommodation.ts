import type { Guest, Layout, Room } from '../types';
import { ACCOMMODATION_ROOMS, type AccommodationSlot } from '../data/accommodation-seed';
import { normalizeLayout } from './constraints';
import { newId } from './ids';

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function firstToken(name: string): string {
  return normalizeName(name).split(' ')[0] ?? '';
}

function paidNote(paid?: string): string {
  if (!paid) return '';
  return `Accommodation paid: ${paid}`;
}

function mergeNotes(existing: string, addition: string): string {
  if (!addition) return existing;
  if (!existing) return addition;
  if (existing.includes(addition)) return existing;
  return `${existing} · ${addition}`;
}

function guestMatches(existing: Guest, slotName: string): boolean {
  const a = normalizeName(existing.name);
  const b = normalizeName(slotName);
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  return firstToken(existing.name) === firstToken(slotName) && firstToken(slotName).length > 2;
}

function defaultGuest(name: string, notes: string): Guest {
  const trimmed = name.trim();
  const isCouple = trimmed.toLowerCase().includes('ella') || trimmed.toLowerCase().includes('mark');
  return {
    id: newId(),
    name: trimmed,
    email: '',
    phone: '',
    status: 'confirmed',
    group: isCouple ? (trimmed.toLowerCase().includes('ella') ? 'bride' : 'groom') : 'other',
    dietary: 'none',
    tableId: null,
    seatNumber: null,
    notes,
    plusOne: false,
    plusOneName: '',
    plusOneTableId: null,
    plusOneSeatNumber: null,
  };
}

function findOrCreateGuest(guests: Guest[], slot: AccommodationSlot): Guest {
  const note = paidNote(slot.paid);
  const existingIdx = guests.findIndex((g) => guestMatches(g, slot.name));

  if (existingIdx >= 0) {
    const existing = guests[existingIdx]!;
    const updated: Guest = {
      ...existing,
      name: existing.name.trim() || slot.name.trim(),
      notes: mergeNotes(existing.notes, note),
      status: existing.status === 'declined' ? existing.status : 'confirmed',
    };
    guests[existingIdx] = updated;
    return updated;
  }

  const created = defaultGuest(slot.name, note);
  guests.push(created);
  return created;
}

/**
 * Apply the Grønnessegaard accommodation plan to a layout.
 * Preserves shapes, tables, constraints, and guests not in the sheet.
 */
export function applyAccommodationSeed(layout: Layout): Layout {
  const guests = layout.guests.map((g) => ({ ...g }));
  const existingByKey = new Map<string, Room>();
  for (const room of layout.rooms) {
    existingByKey.set(`${room.building}::${room.name}`, room);
  }

  const rooms: Room[] = ACCOMMODATION_ROOMS.map((def) => {
    const existing = existingByKey.get(`${def.building}::${def.name}`);
    const guestIds = def.occupants.map((slot) => findOrCreateGuest(guests, slot).id);
    return {
      id: existing?.id ?? def.id,
      name: def.name,
      building: def.building,
      type: def.type,
      capacity: def.capacity,
      guestIds,
      notes: def.notes ?? existing?.notes ?? '',
      floor: def.floor,
    };
  });

  return normalizeLayout({
    ...layout,
    guests,
    rooms,
    updatedAt: new Date().toISOString(),
  });
}
