import { PropertiesPanel } from './PropertiesPanel';
import { LayoutPanel } from './LayoutPanel';
import { useEditorStore } from '../../store/editor-store';
import type Konva from 'konva';

interface SidebarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function Sidebar({ stageRef }: SidebarProps) {
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 overflow-y-auto">
      {selectedShapeId ? (
        <PropertiesPanel />
      ) : (
        <LayoutPanel stageRef={stageRef} />
      )}
    </div>
  );
}
