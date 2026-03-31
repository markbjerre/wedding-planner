import { useMemo, useState } from 'react';
import type { Guest } from '../../types';

interface GuestPickerModalProps {
  open: boolean;
  onClose: () => void;
  tableLabel: string;
  /** Guests already at this table (excluded from pick list). */
  excludeTableId: string;
  allGuests: Guest[];
  onPick: (guestId: string) => void;
  tableFull: boolean;
}

export function GuestPickerModal({
  open,
  onClose,
  tableLabel,
  excludeTableId,
  allGuests,
  onPick,
  tableFull,
}: GuestPickerModalProps) {
  const [q, setQ] = useState('');

  const candidates = useMemo(() => {
    const list = allGuests.filter((g) => g.tableId !== excludeTableId);
    if (!q.trim()) return list;
    const lower = q.toLowerCase();
    return list.filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.email.toLowerCase().includes(lower)
    );
  }, [allGuests, excludeTableId, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-picker-title"
      onClick={onClose}
    >
      <div
        className="bg-stone-50 rounded-xl border border-stone-200 shadow-xl max-w-md w-full max-h-[min(420px,80vh)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
          <h2 id="guest-picker-title" className="text-sm font-semibold text-stone-800">
            Add guest to “{tableLabel}”
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800 text-lg leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {tableFull ? (
          <p className="p-4 text-sm text-amber-800 bg-amber-50">
            This table has no free seats. Increase “Seats” on the table or remove a guest first.
          </p>
        ) : (
          <>
            <div className="p-3 border-b border-stone-100">
              <input
                type="search"
                placeholder="Search guests…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                autoFocus
              />
              <p className="text-[10px] text-stone-500 mt-1.5">
                Shows guests not already at this table (unassigned or seated elsewhere).
              </p>
            </div>
            <ul className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1">
              {candidates.length === 0 ? (
                <li className="text-sm text-stone-400 text-center py-6">No guests match.</li>
              ) : (
                candidates.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(g.id);
                        setQ('');
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:bg-amber-50 hover:border-amber-200 transition-colors"
                    >
                      <div className="font-medium text-stone-800" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                        {g.name}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-stone-500">
                        <span className="capitalize">{g.status}</span>
                        {g.tableId && (
                          <span className="text-amber-700">At another table</span>
                        )}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
