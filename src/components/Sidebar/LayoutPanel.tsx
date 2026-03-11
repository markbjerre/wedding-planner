import { useEditorStore } from '../../store/editor-store';
import { downloadLayoutJSON, loadFromFile } from '../../lib/storage';
import { exportToPNG, exportToPDF } from '../../lib/export';
import type Konva from 'konva';

interface LayoutPanelProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function LayoutPanel({ stageRef }: LayoutPanelProps) {
  const layout = useEditorStore((s) => s.layout);
  const guests = useEditorStore((s) => s.layout.guests);
  const shapes = useEditorStore((s) => s.layout.shapes);
  const rooms = useEditorStore((s) => s.layout.rooms);

  const updateLayoutMeta = useEditorStore((s) => s.updateLayoutMeta);
  const setLayout = useEditorStore((s) => s.setLayout);

  const handleLoadJSON = async () => {
    try {
      const loadedLayout = await loadFromFile();
      setLayout(loadedLayout);
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
  };

  const handleExportPNG = () => {
    if (stageRef.current) {
      exportToPNG(stageRef.current, `${layout.name.replace(/\s+/g, '-')}.png`);
    }
  };

  const handleExportPDF = () => {
    if (stageRef.current) {
      exportToPDF(stageRef.current, `${layout.name.replace(/\s+/g, '-')}.pdf`);
    }
  };

  // Calculate stats
  const confirmedGuests = guests.filter((g) => g.status === 'confirmed').length;
  const unseatedGuests = guests.filter((g) => !g.tableId).length;
  const tableShapes = shapes.filter(
    (s) => s.kind === 'round-table' || s.kind === 'rect-table'
  );
  const totalSeats = tableShapes.reduce((sum, s) => sum + s.seats, 0);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">Layout Settings</h3>

      {/* Layout name */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Layout Name</label>
        <input
          type="text"
          value={layout.name}
          onChange={(e) => updateLayoutMeta({ name: e.target.value })}
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Venue name */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Venue Name</label>
        <input
          type="text"
          value={layout.venueName}
          onChange={(e) => updateLayoutMeta({ venueName: e.target.value })}
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Venue dimensions */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Width (px)
          </label>
          <input
            type="number"
            value={layout.venueWidth}
            onChange={(e) =>
              updateLayoutMeta({ venueWidth: Math.max(100, parseInt(e.target.value) || 100) })
            }
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Height (px)
          </label>
          <input
            type="number"
            value={layout.venueHeight}
            onChange={(e) =>
              updateLayoutMeta({ venueHeight: Math.max(100, parseInt(e.target.value) || 100) })
            }
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          />
        </div>
      </div>

      {/* Grid size */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Grid Size (px)</label>
        <input
          type="number"
          value={layout.gridSize}
          onChange={(e) =>
            updateLayoutMeta({ gridSize: Math.max(4, parseInt(e.target.value) || 40) })
          }
          className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700" />

      {/* Export/Import buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => downloadLayoutJSON(layout)}
          className="h-8 px-3 bg-blue-900 text-blue-300 hover:bg-blue-800 rounded text-sm font-medium transition-colors"
        >
          Save JSON
        </button>
        <button
          onClick={handleLoadJSON}
          className="h-8 px-3 bg-blue-900 text-blue-300 hover:bg-blue-800 rounded text-sm font-medium transition-colors"
        >
          Load JSON
        </button>
        <button
          onClick={handleExportPNG}
          className="h-8 px-3 bg-green-900 text-green-300 hover:bg-green-800 rounded text-sm font-medium transition-colors"
        >
          Export PNG
        </button>
        <button
          onClick={handleExportPDF}
          className="h-8 px-3 bg-green-900 text-green-300 hover:bg-green-800 rounded text-sm font-medium transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700" />

      {/* Stats */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-3">Stats</h4>
        <div className="space-y-2 text-xs text-gray-300">
          <div className="flex justify-between">
            <span>Shapes:</span>
            <span className="font-mono">{shapes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Guests:</span>
            <span className="font-mono">{guests.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Confirmed:</span>
            <span className="font-mono text-green-400">{confirmedGuests}</span>
          </div>
          <div className="flex justify-between">
            <span>Tables:</span>
            <span className="font-mono">{tableShapes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Seats:</span>
            <span className="font-mono">{totalSeats}</span>
          </div>
          <div className="flex justify-between">
            <span>Unseated:</span>
            <span
              className={`font-mono ${unseatedGuests > 0 ? 'text-red-400' : 'text-green-400'}`}
            >
              {unseatedGuests}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Rooms:</span>
            <span className="font-mono">{rooms.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
