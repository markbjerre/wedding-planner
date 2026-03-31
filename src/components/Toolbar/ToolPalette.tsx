import { useState } from 'react';
import { useEditorStore } from '../../store/editor-store';
import type { ActiveTool, ShapeKind } from '../../types';

type PlaceEntry = { id: ShapeKind; label: string; icon: string };

const SECTIONS: Array<{ title: string; tools: PlaceEntry[] }> = [
  {
    title: 'Tables',
    tools: [
      { id: 'round-table', label: 'Round table', icon: '◯' },
      { id: 'rect-table', label: 'Rect table', icon: '▭' },
      { id: 'chair', label: 'Chair', icon: '⊡' },
    ],
  },
  {
    title: 'Structure',
    tools: [
      { id: 'wall', label: 'Wall', icon: '━' },
      { id: 'pillar', label: 'Pillar', icon: '◉' },
      { id: 'door', label: 'Door', icon: '⌐' },
    ],
  },
  {
    title: 'Areas',
    tools: [
      { id: 'zone', label: 'Zone', icon: '⬜' },
      { id: 'dance-floor', label: 'Dance floor', icon: '◈' },
      { id: 'stage', label: 'Stage', icon: '▬' },
    ],
  },
  {
    title: 'Objects',
    tools: [
      { id: 'decoration', label: 'Decoration', icon: '✦' },
      { id: 'item', label: 'Item', icon: '⊞' },
    ],
  },
];

export function ToolPalette() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const [expanded, setExpanded] = useState(true);

  const isPlaceTool = (id: ActiveTool): id is ShapeKind =>
    id !== 'select' && id !== 'dimension';

  const placeActive: ShapeKind | null = isPlaceTool(activeTool)
    ? activeTool
    : null;

  return (
    <aside
      className={`shrink-0 border-l border-stone-200 bg-stone-50/95 flex flex-col transition-[width] duration-200 ease-out ${
        expanded ? 'w-[13.5rem]' : 'w-12'
      }`}
      aria-label="Place shapes"
    >
      <div className="flex items-center justify-between gap-1 px-2 py-2 border-b border-stone-200 shrink-0">
        {expanded && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 truncate">
            Place
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-auto h-7 w-7 rounded-md border border-stone-200 bg-white text-stone-600 text-xs hover:bg-stone-100 flex items-center justify-center shrink-0"
          title={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
        >
          {expanded ? '◀' : '▶'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1.5 space-y-3 min-h-0">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            {expanded && (
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-1.5 mb-1.5">
                {section.title}
              </h3>
            )}
            <div className="flex flex-col gap-1">
              {section.tools.map((tool) => {
                const active = placeActive === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setActiveTool(tool.id)}
                    title={tool.label}
                    className={`flex items-center gap-2 rounded-lg border text-left transition-colors min-h-[2.25rem] ${
                      expanded ? 'px-2.5 py-2' : 'px-0 justify-center py-2'
                    } ${
                      active
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-base font-medium w-6 text-center shrink-0 tabular-nums">
                      {tool.icon}
                    </span>
                    {expanded && (
                      <span className="text-xs font-medium leading-tight truncate">
                        {tool.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!expanded && (
        <p className="text-[9px] text-stone-400 text-center px-1 pb-2 leading-tight">
          Expand for labels
        </p>
      )}
    </aside>
  );
}
