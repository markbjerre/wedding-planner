import { useEditorStore } from '../../store/editor-store';

export function PropertiesPanel() {
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);
  const layout = useEditorStore((s) => s.layout);
  const guests = useEditorStore((s) => s.layout.guests);

  const updateShape = useEditorStore((s) => s.updateShape);
  const deleteShape = useEditorStore((s) => s.deleteShape);
  const duplicateShape = useEditorStore((s) => s.duplicateShape);
  const moveShapeToFront = useEditorStore((s) => s.moveShapeToFront);
  const moveShapeToBack = useEditorStore((s) => s.moveShapeToBack);
  const selectShape = useEditorStore((s) => s.selectShape);

  if (!selectedShapeId) return null;

  const shape = layout.shapes.find((s) => s.id === selectedShapeId);
  if (!shape) return null;

  const isTable =
    shape.kind === 'round-table' || shape.kind === 'rect-table';
  const tableGuests = guests.filter((g) => g.tableId === shape.id);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">Shape Properties</h3>

      {/* Label */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Label</label>
        <input
          type="text"
          value={shape.label}
          onChange={(e) => updateShape(shape.id, { label: e.target.value })}
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Color</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className="w-10 h-8 rounded cursor-pointer"
          />
          <input
            type="text"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          />
        </div>
      </div>

      {/* Width */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Width (px)</label>
        <input
          type="number"
          value={shape.width}
          onChange={(e) =>
            updateShape(shape.id, { width: Math.max(20, parseInt(e.target.value) || 20) })
          }
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Height */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Height (px)</label>
        <input
          type="number"
          value={shape.height}
          onChange={(e) =>
            updateShape(shape.id, { height: Math.max(20, parseInt(e.target.value) || 20) })
          }
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Rotation */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Rotation (degrees)
        </label>
        <input
          type="number"
          value={shape.rotation}
          onChange={(e) =>
            updateShape(shape.id, { rotation: parseInt(e.target.value) || 0 })
          }
          min={0}
          max={360}
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Seats (for tables) */}
      {isTable && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Seats</label>
          <input
            type="number"
            value={shape.seats}
            onChange={(e) =>
              updateShape(shape.id, { seats: Math.max(1, parseInt(e.target.value) || 1) })
            }
            min={1}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          />
        </div>
      )}

      {/* Locked checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="locked"
          checked={shape.locked}
          onChange={(e) => updateShape(shape.id, { locked: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="locked" className="text-sm text-gray-400">
          Locked
        </label>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700" />

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => duplicateShape(shape.id)}
          className="h-8 px-3 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
        >
          Duplicate
        </button>
        <button
          onClick={() => moveShapeToFront(shape.id)}
          className="h-8 px-3 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
        >
          Move to Front
        </button>
        <button
          onClick={() => moveShapeToBack(shape.id)}
          className="h-8 px-3 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
        >
          Move to Back
        </button>
        <button
          onClick={() => {
            deleteShape(shape.id);
            selectShape(null);
          }}
          className="h-8 px-3 bg-red-900 text-red-300 hover:bg-red-800 rounded text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Guest assignments for tables */}
      {isTable && tableGuests.length > 0 && (
        <>
          <div className="h-px bg-gray-700" />
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">
              Assigned Guests
            </h4>
            <div className="space-y-1">
              {tableGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => {
                    // Selecting a guest is handled via the store
                    useEditorStore.setState({ selectedGuestId: guest.id });
                  }}
                  className="block w-full text-left px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                >
                  {guest.name} (Seat {guest.seatNumber})
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
