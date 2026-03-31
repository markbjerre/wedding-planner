import type { Guest } from '../types';

/** First free seat index in 1..maxSeats, or null if full. */
export function nextSeatForTable(
  guests: Guest[],
  tableId: string,
  maxSeats: number
): number | null {
  const taken = new Set(
    guests
      .filter((g) => g.tableId === tableId && g.seatNumber != null)
      .map((g) => g.seatNumber as number)
  );
  for (let s = 1; s <= maxSeats; s++) {
    if (!taken.has(s)) return s;
  }
  return null;
}
