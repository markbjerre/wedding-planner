import { useEditorStore } from '../../store/editor-store';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { LayoutPanel } from './LayoutPanel';
import type Konva from 'konva';
import type { SidebarTab } from '../../types';

interface SidebarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: 'properties', label: 'Properties' },
  { id: 'layers',     label: 'Layers' },
  { id: 'layout',     label: 'Layout' },
];

export function Sidebar({ stageRef }: SidebarProps) {
  const sidebarTab = useEditorStore((s) => s.sidebarTab);
  const setSidebarTab = useEditorStore((s) => s.setSidebarTab);
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);

  return (
    <div className="w-72 bg-stone-50 border-l border-stone-200 flex flex-col shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-stone-200 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              sidebarTab === tab.id
                ? 'border-amber-600 text-amber-700 bg-amber-50'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100'
            }`}
          >
            {tab.label}
            {tab.id === 'properties' && selectedShapeId && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sidebarTab === 'properties' && <PropertiesPanel />}
        {sidebarTab === 'layers'     && <LayersPanel />}
        {sidebarTab === 'layout'     && <LayoutPanel stageRef={stageRef} />}
      </div>
    </div>
  );
}
