import { useEditorStore } from '../../store/editor-store';
import type { LayerId } from '../../types';
import { ALL_LAYER_IDS } from '../../types';

const LAYER_ORDER: LayerId[] = [...ALL_LAYER_IDS];

const LAYER_ICONS: Record<LayerId, string> = {
  floorplan:   '⬡',
  fixed:       '⬛',
  tables:      '◯',
  decorations: '✦',
};

export function LayersPanel() {
  const layers               = useEditorStore((s) => s.layout.layers);
  const activeLayerId        = useEditorStore((s) => s.activeLayerId);
  const canvasLayerFilterIds = useEditorStore((s) => s.canvasLayerFilterIds);
  const shapes               = useEditorStore((s) => s.layout.shapes);

  const setActiveLayer         = useEditorStore((s) => s.setActiveLayer);
  const toggleCanvasLayerFilter = useEditorStore((s) => s.toggleCanvasLayerFilter);
  const setCanvasLayerFilterIds = useEditorStore((s) => s.setCanvasLayerFilterIds);
  const showAllCanvasLayers    = useEditorStore((s) => s.showAllCanvasLayers);
  const toggleLayerLock        = useEditorStore((s) => s.toggleLayerLock);

  const layerMap = Object.fromEntries(layers.map((l) => [l.id, l]));

  const filterCount = canvasLayerFilterIds.length;

  return (
    <div className="p-4 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Canvas Layers</h3>
        <p className="text-xs text-stone-500 mb-3 leading-relaxed">
          <strong>Show on canvas</strong> — select one or more layers; only shapes on those layers are drawn.
          Each shape has a layer (Properties or default by type).{' '}
          <strong>Active</strong> — where new shapes are placed.
        </p>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => showAllCanvasLayers()}
            className="text-xs px-2 py-1 rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
          >
            Show all layers
          </button>
          <button
            type="button"
            onClick={() => setCanvasLayerFilterIds([])}
            className="text-xs px-2 py-1 rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
          >
            Hide all
          </button>
          <span className="text-xs text-stone-400 self-center tabular-nums">
            {filterCount} / {ALL_LAYER_IDS.length} visible
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {LAYER_ORDER.map((layerId) => {
          const layer = layerMap[layerId];
          if (!layer) return null;
          const count = shapes.filter((s) => s.layer === layerId).length;
          const isActive = activeLayerId === layerId;
          const inFilter = canvasLayerFilterIds.includes(layerId);

          return (
            <div
              key={layerId}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all ${
                isActive
                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                  : 'bg-white border-stone-100 hover:border-stone-200'
              }`}
            >
              {/* Filter checkbox — which layers appear on canvas */}
              <label className="flex items-center shrink-0 cursor-pointer" title="Show shapes on this layer on the canvas">
                <input
                  type="checkbox"
                  checked={inFilter}
                  onChange={() => toggleCanvasLayerFilter(layerId)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
              </label>

              {/* Active layer (placement) */}
              <button
                type="button"
                onClick={() => setActiveLayer(layerId)}
                className={`flex-1 flex items-center gap-2 min-w-0 text-left rounded-md px-1 py-0.5 -my-0.5 ${
                  isActive ? '' : 'hover:bg-stone-50/80'
                }`}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                <span className="text-sm mr-0.5 text-stone-400">{LAYER_ICONS[layerId]}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isActive ? 'text-amber-800' : 'text-stone-700'}`}>
                    {layer.name}
                    {isActive && (
                      <span className="ml-1.5 text-[10px] font-normal text-amber-600">(active)</span>
                    )}
                  </div>
                  <div className="text-xs text-stone-400">{count} item{count !== 1 ? 's' : ''}</div>
                </div>
              </button>

              {/* Lock */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => toggleLayerLock(layerId)}
                  className={`w-7 h-7 rounded-md text-sm transition-colors border ${
                    layer.locked
                      ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                      : 'bg-stone-50 text-stone-300 border-stone-100 hover:bg-stone-100'
                  }`}
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-stone-100">
        <p className="text-xs text-stone-400">
          Check layers to filter the canvas. Click a layer name to set it active for new shapes. Alt+click a layer in the toolbar also toggles the canvas filter.
        </p>
      </div>
    </div>
  );
}
