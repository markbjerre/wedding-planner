import { useCallback } from 'react';
import { useEditorStore } from '../../store/editor-store';
import type { ActiveTool, AppView } from '../../types';

const TOOLS: Array<{ id: ActiveTool; label: string; icon: string }> = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'round-table', label: 'Round Table', icon: '◯' },
  { id: 'rect-table', label: 'Rect Table', icon: '▭' },
  { id: 'chair', label: 'Chair', icon: '⊡' },
  { id: 'stage', label: 'Stage', icon: '▬' },
  { id: 'dance-floor', label: 'Dance Floor', icon: '◈' },
  { id: 'zone', label: 'Zone', icon: '⬜' },
  { id: 'decoration', label: 'Decoration', icon: '✦' },
];

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const showGrid = useEditorStore((s) => s.showGrid);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const showDistances = useEditorStore((s) => s.showDistances);
  const view = useEditorStore((s) => s.view);

  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const toggleDistances = useEditorStore((s) => s.toggleDistances);
  const setView = useEditorStore((s) => s.setView);

  const handleZoomIn = useCallback(() => {
    setZoom(zoom * 1.2);
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(zoom / 1.2);
  }, [zoom, setZoom]);

  const handleFitToView = useCallback(() => {
    setZoom(1);
    setPan(0, 0);
  }, [setZoom, setPan]);

  const handleViewChange = (newView: AppView) => {
    setView(newView);
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
      {/* Title + Left tools */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-rose-500">Wedding Planner</h1>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Tool buttons */}
        <div className="flex gap-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`h-8 px-2 rounded text-sm font-medium transition-colors ${
                activeTool === tool.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Middle: Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="h-8 px-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded text-sm"
          title="Zoom out"
        >
          −
        </button>
        <div className="w-12 text-center text-sm text-gray-400">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={handleZoomIn}
          className="h-8 px-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded text-sm"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleFitToView}
          className="h-8 px-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded text-sm"
          title="Fit to view"
        >
          Fit
        </button>
      </div>

      {/* Right: View controls and toggles */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Toggles */}
        <div className="flex gap-1">
          <button
            onClick={toggleGrid}
            className={`h-8 px-2 rounded text-sm font-medium transition-colors ${
              showGrid
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Toggle grid"
          >
            Grid
          </button>
          <button
            onClick={toggleSnap}
            className={`h-8 px-2 rounded text-sm font-medium transition-colors ${
              snapToGrid
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Toggle snap to grid"
          >
            Snap
          </button>
          <button
            onClick={toggleDistances}
            className={`h-8 px-2 rounded text-sm font-medium transition-colors ${
              showDistances
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Toggle distance guides"
          >
            Distances
          </button>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* View tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => handleViewChange('editor')}
            className={`h-8 px-3 rounded text-sm font-medium transition-colors ${
              view === 'editor'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => handleViewChange('guests')}
            className={`h-8 px-3 rounded text-sm font-medium transition-colors ${
              view === 'guests'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Guests
          </button>
          <button
            onClick={() => handleViewChange('rooms')}
            className={`h-8 px-3 rounded text-sm font-medium transition-colors ${
              view === 'rooms'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Rooms
          </button>
        </div>
      </div>
    </div>
  );
}
