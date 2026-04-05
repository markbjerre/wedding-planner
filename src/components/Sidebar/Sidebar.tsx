import { useEditorStore } from '../../store/editor-store';
import { useUiStore } from '../../store/ui-store';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
  { id: 'layers', label: 'Layers' },
  { id: 'layout', label: 'Layout' },
];

export function Sidebar({ stageRef }: SidebarProps) {
  const sidebarTab = useEditorStore((s) => s.sidebarTab);
  const setSidebarTab = useEditorStore((s) => s.setSidebarTab);
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);
  const isMd = useMediaQuery('(min-width: 768px)');
  const mobileSidebarOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <>
      {!isMd && mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`
          w-[min(100vw,18rem)] md:w-72 bg-stone-50 border-l border-stone-200 flex flex-col shadow-sm
          fixed inset-y-0 right-0 z-50 md:static md:inset-auto md:z-auto md:translate-x-0
          transition-transform duration-200 ease-out
          ${isMd || mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex border-b border-stone-200 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 min-h-[44px] md:min-h-0 ${
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

        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {sidebarTab === 'properties' && <PropertiesPanel />}
          {sidebarTab === 'layers' && <LayersPanel />}
          {sidebarTab === 'layout' && <LayoutPanel stageRef={stageRef} />}
        </div>
      </div>
    </>
  );
}
