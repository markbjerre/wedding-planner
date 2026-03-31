import { useCallback } from 'react';
import { useEditorStore } from '../../store/editor-store';
import type { ActiveTool, AppView, LayerId } from '../../types';

/** Primary tools only — shape placement lives in the right-hand Tool palette (editor). */
const PRIMARY_TOOLS: Array<{ id: ActiveTool; label: string; icon: string }> = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'dimension', label: 'Dimension', icon: '⊕' },
];

const LAYER_LABELS: Record<LayerId, string> = {
  floorplan: 'Floorplan',
  fixed: 'Fixed',
  tables: 'Tables',
  decorations: 'Decor',
};

export function Toolbar() {
  const activeTool  = useEditorStore((s) => s.activeTool);
  const zoom        = useEditorStore((s) => s.zoom);
  const showGrid    = useEditorStore((s) => s.showGrid);
  const snapToGrid  = useEditorStore((s) => s.snapToGrid);
  const showDistances = useEditorStore((s) => s.showDistances);
  const view        = useEditorStore((s) => s.view);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const canvasLayerFilterIds = useEditorStore((s) => s.canvasLayerFilterIds);
  const layers      = useEditorStore((s) => s.layout.layers);

  const setActiveTool   = useEditorStore((s) => s.setActiveTool);
  const toggleCanvasLayerFilter = useEditorStore((s) => s.toggleCanvasLayerFilter);
  const setZoom         = useEditorStore((s) => s.setZoom);
  const setPan          = useEditorStore((s) => s.setPan);
  const toggleGrid      = useEditorStore((s) => s.toggleGrid);
  const toggleSnap      = useEditorStore((s) => s.toggleSnap);
  const toggleDistances = useEditorStore((s) => s.toggleDistances);
  const setView         = useEditorStore((s) => s.setView);
  const setActiveLayer  = useEditorStore((s) => s.setActiveLayer);
  const undo            = useEditorStore((s) => s.undo);
  const redo            = useEditorStore((s) => s.redo);

  const handleFitToView = useCallback(() => { setZoom(1); setPan(0, 0); }, [setZoom, setPan]);

  const BASE_BTN   = 'h-8 px-2 rounded-md text-sm font-medium transition-colors border';
  const ACTIVE_BTN = 'bg-amber-600 text-white border-amber-600 shadow-sm';
  const IDLE_BTN   = 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-200';
  const TOGGLE_ON  = 'bg-stone-200 text-stone-700 border-stone-300';
  const TOGGLE_OFF = 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100';

  return (
    <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-3 shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-4 shrink-0">
        <div>
          <span className="text-base font-semibold text-stone-800 tracking-tight">Wedding</span>
          <span className="text-base font-light text-amber-700 tracking-tight"> Planner</span>
        </div>
        <div className="h-5 w-px bg-stone-200" />

        {/* Select + Dimension — place shapes from the palette beside the canvas */}
        <div className="flex gap-1">
          {PRIMARY_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`${BASE_BTN} ${activeTool === tool.id ? ACTIVE_BTN : IDLE_BTN}`}
              title={tool.id === 'dimension' ? 'Dimension lock — edge distance (Fusion-style)' : tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
        {view === 'editor' && (
          <span className="text-[11px] text-stone-400 max-w-[11rem] leading-snug hidden xl:inline">
            Shapes: use the <strong className="text-stone-500 font-medium">Place</strong> panel →
          </span>
        )}
      </div>

      {/* Active layer (placement) + canvas filter (Alt+click toggles) */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-stone-400 mr-1">Layer:</span>
        {layers.map((layer) => {
          const inFilter = canvasLayerFilterIds.includes(layer.id);
          return (
            <button
              key={layer.id}
              onClick={(e) => {
                if (e.altKey) {
                  e.preventDefault();
                  toggleCanvasLayerFilter(layer.id);
                } else {
                  setActiveLayer(layer.id);
                }
              }}
              className={`h-7 px-2 rounded-md text-xs font-medium transition-colors border ${
                activeLayerId === layer.id
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
              } ${!inFilter ? 'opacity-40 line-through' : ''}`}
              title={`${layer.name} — click: active for new shapes · Alt+click: toggle canvas filter`}
            >
              {LAYER_LABELS[layer.id]}
            </button>
          );
        })}
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setZoom(zoom / 1.2)} className={`${BASE_BTN} ${IDLE_BTN} w-8`} title="Zoom out">−</button>
        <div className="w-12 text-center text-xs text-stone-500 font-mono tabular-nums">{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom(zoom * 1.2)} className={`${BASE_BTN} ${IDLE_BTN} w-8`} title="Zoom in">+</button>
        <button onClick={handleFitToView} className={`${BASE_BTN} ${IDLE_BTN}`} title="Fit to view">Fit</button>
      </div>

      {/* Toggles + undo/redo */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={undo} className={`${BASE_BTN} ${IDLE_BTN} w-8`} title="Undo (Ctrl+Z)">↩</button>
        <button onClick={redo} className={`${BASE_BTN} ${IDLE_BTN} w-8`} title="Redo (Ctrl+Shift+Z)">↪</button>
        <div className="h-5 w-px bg-stone-200 mx-1" />
        <button onClick={toggleGrid} className={`${BASE_BTN} ${showGrid ? TOGGLE_ON : TOGGLE_OFF}`} title="Toggle grid">Grid</button>
        <button onClick={toggleSnap} className={`${BASE_BTN} ${snapToGrid ? TOGGLE_ON : TOGGLE_OFF}`} title="Toggle snap">Snap</button>
        <button onClick={toggleDistances} className={`${BASE_BTN} ${showDistances ? TOGGLE_ON : TOGGLE_OFF}`} title="Toggle distances">Dist</button>
        <div className="h-5 w-px bg-stone-200 mx-1" />

        {/* View tabs */}
        {(['editor', 'guests', 'rooms'] as AppView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`${BASE_BTN} ${view === v ? ACTIVE_BTN : IDLE_BTN} capitalize`}
          >
            {v === 'editor' ? 'Editor' : v === 'guests' ? 'Guests' : 'Rooms'}
          </button>
        ))}
      </div>
    </div>
  );
}
