import { useEditorStore } from '../../store/editor-store';
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

      {/* Layer assignment */}
      <div>
        <label className={LABEL}>Layer</label>
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

      {/* Width / Height */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>Width (px)</label>
          <input type="number" value={shape.width}
            onChange={(e) => updateShape(shape.id, { width: Math.max(20, +e.target.value || 20) })}
            className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Height (px)</label>
          <input type="number" value={shape.height}
            onChange={(e) => updateShape(shape.id, { height: Math.max(20, +e.target.value || 20) })}
            className={INPUT} />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className={LABEL}>Rotation — {shape.rotation}°</label>
        <input
          type="range"
          min={0} max={360} value={shape.rotation}
          onChange={(e) => updateShape(shape.id, { rotation: +e.target.value })}
          className="w-full accent-amber-600"
        />
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
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Guests at this table</h4>
            <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">
              {tableGuests.length}/{shape.seats}
            </span>
          </div>
          {tableGuests.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No guests assigned yet.</p>
          ) : (
            <div className="space-y-1">
              {tableGuests.map((guest) => (
                <div key={guest.id}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-stone-100 text-xs text-stone-700">
                  <span>{guest.name}</span>
                  <span className="text-stone-400">Seat {guest.seatNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
