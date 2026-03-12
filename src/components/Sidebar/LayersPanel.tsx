import { useEditorStore } from '../../store/editor-store';
import type { LayerId } from '../../types';

const LAYER_ORDER: LayerId[] = ['floorplan', 'fixed', 'tables', 'decorations'];

const LAYER_ICONS: Record<LayerId, string> = {
  floorplan:   '⬡',
  fixed:       '⬛',
  tables:      '◯',
  decorations: '✦',
};

export function LayersPanel() {
  const layers        = useEditorStore((s) => s.layout.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const shapes        = useEditorStore((s) => s.layout.shapes);

  const setActiveLayer      = useEditorStore((s) => s.setActiveLayer);
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock     = useEditorStore((s) => s.toggleLayerLock);

  const layerMap = Object.fromEntries(layers.map((l) => [l.id, l]));

  return (
    <div className="p-4 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Canvas Layers</h3>
        <p className="text-xs text-stone-400 mb-4">
          New shapes are added to the active layer. Lock a layer to prevent accidental edits.
        </p>
      </div>

      <div className="space-y-1.5">
        {LAYER_ORDER.map((layerId) => {
          const layer = layerMap[layerId];
          if (!layer) return null;
          const count = shapes.filter((s) => s.layer === layerId).length;
          const isActive = activeLayerId === layerId;

          return (
            <div
              key={layerId}
              onClick={() => setActiveLayer(layerId)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
                isActive
                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                  : 'bg-white border-stone-100 hover:bg-stone-50 hover:border-stone-200'
              }`}
            >
              {/* Layer color dot */}
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />

              {/* Icon + name */}
              <span className="text-sm mr-0.5 text-stone-400">{LAYER_ICONS[layerId]}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isActive ? 'text-amber-800' : 'text-stone-700'}`}>
                  {layer.name}
                </div>
                <div className="text-xs text-stone-400">{count} item{count !== 1 ? 's' : ''}</div>
              </div>

              {/* Controls */}
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Visibility toggle */}
                <button
                  onClick={() => toggleLayerVisibility(layerId)}
                  className={`w-7 h-7 rounded-md text-sm transition-colors border ${
                    layer.visible
                      ? 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      : 'bg-stone-50 text-stone-300 border-stone-100 hover:bg-stone-100'
                  }`}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? '👁' : '—'}
                </button>

                {/* Lock toggle */}
                <button
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
          Click a layer to make it active. The active layer receives new shapes.
        </p>
      </div>
    </div>
  );
}
