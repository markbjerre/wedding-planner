import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { pxToCm, parseCmStringToPx, isInvalidCmDraft } from '../../lib/units';
import { nextSeatForTable } from '../../lib/tableGuests';
import { drivenAxesLocked } from '../../lib/constraints';
import { GuestPickerModal } from './GuestPickerModal';
import type { LayerId } from '../../types';

const LAYER_OPTIONS: Array<{ id: LayerId; label: string }> = [
  { id: 'floorplan',   label: 'Floorplan' },
  { id: 'fixed',       label: 'Fixed Items' },
  { id: 'tables',      label: 'Tables' },
  { id: 'decorations', label: 'Decorations' },
];

const INPUT = 'w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400';
const LABEL = 'block text-xs font-medium text-stone-500 mb-1';

export function PropertiesPanel() {
  const selectedShapeId  = useEditorStore((s) => s.selectedShapeId);
  const layout           = useEditorStore((s) => s.layout);
  const guests           = useEditorStore((s) => s.layout.guests);
  const updateShape      = useEditorStore((s) => s.updateShape);
  const deleteShape      = useEditorStore((s) => s.deleteShape);
  const duplicateShape   = useEditorStore((s) => s.duplicateShape);
  const moveShapeToFront = useEditorStore((s) => s.moveShapeToFront);
  const moveShapeToBack  = useEditorStore((s) => s.moveShapeToBack);
  const assignGuestToTable = useEditorStore((s) => s.assignGuestToTable);

  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [widthCmDraft, setWidthCmDraft] = useState<string | null>(null);
  const [heightCmDraft, setHeightCmDraft] = useState<string | null>(null);
  useEffect(() => {
    setGuestPickerOpen(false);
    setWidthCmDraft(null);
    setHeightCmDraft(null);
  }, [selectedShapeId]);

  if (!selectedShapeId) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center gap-2 text-stone-400 pt-16">
        <div className="text-3xl">↖</div>
        <p className="text-sm">Select a shape on the canvas to edit its properties.</p>
      </div>
    );
  }

  const shape = layout.shapes.find((s) => s.id === selectedShapeId);
  if (!shape) return null;

  const isTable = shape.kind === 'round-table' || shape.kind === 'rect-table';
  const tableGuests = guests.filter((g) => g.tableId === shape.id);
  const tableFull =
    isTable && nextSeatForTable(guests, shape.id, shape.seats) === null;
  const widthCm = pxToCm(layout.scale, shape.width);
  const heightCm = pxToCm(layout.scale, shape.height);
  const layerLocked = layout.layers.find((l) => l.id === shape.layer)?.locked ?? false;
  const positionLocked = shape.locked || layerLocked;
  const { lockX: dimLockX, lockY: dimLockY } = drivenAxesLocked(
    shape.id,
    layout.constraints ?? []
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header row: label + lock toggle */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <label className={LABEL}>Label</label>
          <input
            type="text"
            value={shape.label}
            onChange={(e) => updateShape(shape.id, { label: e.target.value })}
            className={INPUT}
          />
        </div>
        <div className="pt-5">
          <button
            onClick={() => updateShape(shape.id, { locked: !shape.locked })}
            className={`w-9 h-9 rounded-lg border text-base transition-all ${
              shape.locked
                ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm'
                : 'bg-white border-stone-200 text-stone-300 hover:border-stone-300 hover:text-stone-500'
            }`}
            title={shape.locked ? 'Locked — click to unlock' : 'Click to lock'}
          >
            {shape.locked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {/* Layer assignment — every shape belongs to one layer (canvas filter + stacking) */}
      <div>
        <label className={LABEL}>Layer</label>
        <p className="text-[10px] text-stone-400 mb-1.5">Shapes appear only when this layer is included in the canvas filter (Layers tab).</p>
        <select
          value={shape.layer}
          onChange={(e) => updateShape(shape.id, { layer: e.target.value as LayerId })}
          className={INPUT}
        >
          {LAYER_OPTIONS.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Centre position (canvas px + venue metres from top-left) */}
      <div className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2.5">
        <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">Position (centre)</h4>
        {(dimLockX || dimLockY) && (
          <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2 leading-snug">
            Dimension lock fixes{' '}
            {dimLockX && dimLockY ? 'X and Y' : dimLockX ? 'X' : 'Y'}
            {dimLockX && dimLockY ? ' (fully fixed)' : ' — drag along the free axis only'}.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>X (px)</label>
            <input
              type="number"
              step={0.5}
              value={shape.x}
              disabled={positionLocked || dimLockX}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) updateShape(shape.id, { x: v });
              }}
              className={`${INPUT} font-mono tabular-nums${positionLocked || dimLockX ? ' opacity-60' : ''}`}
            />
          </div>
          <div>
            <label className={LABEL}>Y (px)</label>
            <input
              type="number"
              step={0.5}
              value={shape.y}
              disabled={positionLocked || dimLockY}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) updateShape(shape.id, { y: v });
              }}
              className={`${INPUT} font-mono tabular-nums${positionLocked || dimLockY ? ' opacity-60' : ''}`}
            />
          </div>
        </div>
        <p className="text-[11px] text-stone-500 mt-2 leading-snug">
          In venue space:{' '}
          <span className="font-mono text-stone-700">
            {(shape.x / layout.scale).toFixed(2)} m
          </span>
          {' '}horizontal,{' '}
          <span className="font-mono text-stone-700">
            {(shape.y / layout.scale).toFixed(2)} m
          </span>
          {' '}vertical from top-left (1 m = {layout.scale} px).
        </p>
      </div>

      {/* Color */}
      <div>
        <label className={LABEL}>Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className="h-9 w-10 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white"
          />
          <input
            type="text"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className={`${INPUT} flex-1 font-mono`}
          />
        </div>
      </div>

      {/* Width / Height — venue cm (1 m = layout.scale px) */}
      <div>
        <p className="text-[10px] text-stone-400 mb-1.5">
          Size in centimetres (from venue scale: 1 m = {layout.scale} px).
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>Width (cm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={widthCmDraft ?? widthCm.toFixed(2)}
              onFocus={() => setWidthCmDraft(widthCm.toFixed(2))}
              onChange={(e) => {
                const v = e.target.value;
                setWidthCmDraft(v);
                const px = parseCmStringToPx(layout.scale, v);
                if (px !== null && px >= 20) {
                  updateShape(shape.id, { width: px });
                }
              }}
              onBlur={() => setWidthCmDraft(null)}
              className={`${INPUT}${
                isInvalidCmDraft(layout.scale, widthCmDraft)
                  ? ' border-red-500 ring-1 ring-red-200'
                  : ''
              }`}
            />
            <p className="text-[10px] text-stone-400 mt-0.5 font-mono tabular-nums">
              ≈ {Math.round(shape.width)} px
            </p>
          </div>
          <div>
            <label className={LABEL}>Height (cm)</label>
            <input
              type="text"
              inputMode="decimal"
              value={heightCmDraft ?? heightCm.toFixed(2)}
              onFocus={() => setHeightCmDraft(heightCm.toFixed(2))}
              onChange={(e) => {
                const v = e.target.value;
                setHeightCmDraft(v);
                const px = parseCmStringToPx(layout.scale, v);
                if (px !== null && px >= 20) {
                  updateShape(shape.id, { height: px });
                }
              }}
              onBlur={() => setHeightCmDraft(null)}
              className={`${INPUT}${
                isInvalidCmDraft(layout.scale, heightCmDraft)
                  ? ' border-red-500 ring-1 ring-red-200'
                  : ''
              }`}
            />
            <p className="text-[10px] text-stone-400 mt-0.5 font-mono tabular-nums">
              ≈ {Math.round(shape.height)} px
            </p>
          </div>
        </div>
      </div>

      {/* Rotation — degrees (slider + numeric) */}
      <div>
        <label className={LABEL}>Rotation (°)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={0.5}
            min={0}
            max={360}
            value={shape.rotation}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '' || raw === '-') return;
              const v = parseFloat(raw);
              if (Number.isNaN(v)) return;
              const norm = ((v % 360) + 360) % 360;
              updateShape(shape.id, { rotation: norm });
            }}
            className={`${INPUT} w-[5.5rem] shrink-0 font-mono tabular-nums`}
          />
          <input
            type="range"
            min={0}
            max={360}
            step={0.5}
            value={shape.rotation}
            onChange={(e) =>
              updateShape(shape.id, { rotation: +e.target.value })
            }
            className="flex-1 min-w-0 accent-amber-600 h-2"
          />
        </div>
      </div>

      {/* Seats */}
      {isTable && (
        <div>
          <label className={LABEL}>Seats</label>
          <input type="number" value={shape.seats} min={1}
            onChange={(e) => updateShape(shape.id, { seats: Math.max(1, +e.target.value || 1) })}
            className={INPUT} />
        </div>
      )}

      <div className="h-px bg-stone-100" />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => duplicateShape(shape.id)}
          className="h-8 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-sm font-medium transition-colors">
          Duplicate
        </button>
        <button onClick={() => moveShapeToFront(shape.id)}
          className="h-8 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-sm font-medium transition-colors">
          To Front
        </button>
        <button onClick={() => moveShapeToBack(shape.id)}
          className="h-8 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-sm font-medium transition-colors">
          To Back
        </button>
        <button
          onClick={() => deleteShape(shape.id)}
          className="h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors">
          Delete
        </button>
      </div>

      {/* Table guests */}
      {isTable && (
        <div>
          <div className="h-px bg-stone-100 mb-3" />
          <div className="flex items-center justify-between mb-2 gap-2">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Guests at this table
            </h4>
            <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-2 py-0.5 shrink-0">
              {tableGuests.length}/{shape.seats}
            </span>
          </div>
          <button
            type="button"
            disabled={tableFull}
            onClick={() => setGuestPickerOpen(true)}
            className="w-full mb-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add guest to table…
          </button>
          {tableGuests.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No guests assigned yet.</p>
          ) : (
            <div className="space-y-1">
              {[...tableGuests]
                .sort(
                  (a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)
                )
                .map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-stone-100 text-xs text-stone-700"
                  >
                    <span
                      className="font-medium text-stone-800 min-w-0 truncate"
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                      }}
                    >
                      {guest.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-stone-400">Seat {guest.seatNumber}</span>
                      <button
                        type="button"
                        onClick={() =>
                          assignGuestToTable(guest.id, null, null)
                        }
                        className="text-[10px] text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {isTable && (
        <GuestPickerModal
          open={guestPickerOpen}
          onClose={() => setGuestPickerOpen(false)}
          tableLabel={shape.label || 'Table'}
          excludeTableId={shape.id}
          allGuests={guests}
          tableFull={tableFull}
          onPick={(guestId) => {
            const freshGuests = useEditorStore.getState().layout.guests;
            const seat = nextSeatForTable(freshGuests, shape.id, shape.seats);
            if (seat == null) return;
            assignGuestToTable(guestId, shape.id, seat);
          }}
        />
      )}
    </div>
  );
}
