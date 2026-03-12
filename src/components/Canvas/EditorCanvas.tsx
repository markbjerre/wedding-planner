import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useEditorStore } from '../../store/editor-store';
import { GridLayer } from './GridLayer';
import { ShapeItem } from './ShapeItem';
import { findSpacingViolations } from '../../lib/spacing';
import type Konva from 'konva';

export interface EditorCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function EditorCanvas({ stageRef }: EditorCanvasProps) {
  const layout        = useEditorStore((s) => s.layout);
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);
  const activeTool    = useEditorStore((s) => s.activeTool);
  const zoom          = useEditorStore((s) => s.zoom);
  const panX          = useEditorStore((s) => s.panX);
  const panY          = useEditorStore((s) => s.panY);

  const addShape    = useEditorStore((s) => s.addShape);
  const selectShape = useEditorStore((s) => s.selectShape);
  const deleteShape = useEditorStore((s) => s.deleteShape);
  const duplicateShape = useEditorStore((s) => s.duplicateShape);
  const setZoom     = useEditorStore((s) => s.setZoom);
  const setPan      = useEditorStore((s) => s.setPan);
  const undo        = useEditorStore((s) => s.undo);
  const redo        = useEditorStore((s) => s.redo);

  const containerRef = useRef<HTMLDivElement>(null);

  // Compute actual canvas dimensions from metres
  const venueW = layout.venueWidthM * layout.scale;
  const venueH = layout.venueHeightM * layout.scale;

  // Layer visibility map
  const layerVisibility = Object.fromEntries(layout.layers.map((l) => [l.id, l.visible]));
  const layerLocked     = Object.fromEntries(layout.layers.map((l) => [l.id, l.locked]));

  const violations    = findSpacingViolations(layout.shapes);
  const violatingIds  = new Set(violations.flat().map((s) => s.id));

  // Visible shapes sorted by zIndex
  const visibleShapes = [...layout.shapes]
    .filter((s) => layerVisibility[s.layer] !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      if (!stageRef.current) return;
      const scaleBy = 1.1;
      const stage   = stageRef.current;
      const oldScale = stage.scaleX();
      const pointer  = stage.getPointerPosition();
      if (!pointer) return;
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      stage.scale({ x: newScale, y: newScale });
      stage.position(newPos);
      setZoom(newScale);
      setPan(newPos.x, newPos.y);
    },
    [stageRef, setZoom, setPan]
  );

  const handleStageDragEnd = useCallback(
    (_e: Konva.KonvaEventObject<DragEvent>) => {
      if (!stageRef.current) return;
      const pos = stageRef.current.position();
      setPan(pos.x, pos.y);
    },
    [setPan, stageRef]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== e.target.getStage() && e.target.name() !== 'venue-bg') return;
      if (activeTool === 'select') {
        selectShape(null);
        return;
      }
      const stage   = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const scale = stage.scaleX();
      const pos   = stage.position();
      const x = (pointer.x - pos.x) / scale;
      const y = (pointer.y - pos.y) / scale;
      addShape(activeTool, x, y);
    },
    [activeTool, selectShape, addShape, stageRef]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId) {
        const shape = layout.shapes.find((s) => s.id === selectedShapeId);
        if (shape && !shape.locked && !layerLocked[shape.layer]) deleteShape(selectedShapeId);
      }
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === 'd' && selectedShapeId) { e.preventDefault(); duplicateShape(selectedShapeId); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedShapeId, layout.shapes, layerLocked, deleteShape, duplicateShape, undo, redo]);

  // Container resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      // Update on resize if needed
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const containerW = containerRef.current?.clientWidth  ?? 900;
  const containerH = containerRef.current?.clientHeight ?? 700;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-stone-200">
      <Stage
        ref={stageRef}
        width={containerW}
        height={containerH}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        draggable={activeTool === 'select' && !selectedShapeId}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
      >
        <GridLayer />
        <Layer>
          {/* Venue boundary */}
          <Rect
            name="venue-bg"
            x={0} y={0}
            width={venueW} height={venueH}
            fill="transparent"
            stroke="#c7bdb4"
            strokeWidth={2}
          />
          {/* Shapes */}
          {visibleShapes.map((shape) => (
            <ShapeItem
              key={shape.id}
              shape={shape}
              isViolating={violatingIds.has(shape.id)}
              layerLocked={layerLocked[shape.layer] ?? false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
