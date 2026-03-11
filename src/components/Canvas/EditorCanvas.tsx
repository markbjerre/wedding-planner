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
  const layout = useEditorStore((s) => s.layout);
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);
  const activeTool = useEditorStore((s) => s.activeTool);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const addShape = useEditorStore((s) => s.addShape);
  const selectShape = useEditorStore((s) => s.selectShape);
  const deleteShape = useEditorStore((s) => s.deleteShape);
  const duplicateShape = useEditorStore((s) => s.duplicateShape);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const containerRef = useRef<HTMLDivElement>(null);
  const violations = findSpacingViolations(layout.shapes);
  const violatingIds = new Set(violations.flat().map((s) => s.id));

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      if (!stageRef.current) return;

      const scaleBy = 1.1;
      const stage = stageRef.current;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      setZoom(newScale);

      // Pan to keep pointer under cursor
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      stage.scale({ x: newScale, y: newScale });

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      stage.position(newPos);
      setPan(newPos.x, newPos.y);
    },
    [setZoom, setPan, stageRef]
  );

  // Handle stage drag for pan
  const handleStageDragEnd = useCallback(
    (_e: Konva.KonvaEventObject<DragEvent>) => {
      if (!stageRef.current) return;
      const pos = stageRef.current.position();
      setPan(pos.x, pos.y);
    },
    [setPan, stageRef]
  );

  // Handle canvas click for shape creation
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only respond to clicks on the background, not on shapes
      if (e.target !== e.currentTarget) return;

      if (activeTool === 'select') {
        selectShape(null);
      } else {
        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Transform pointer position from stage coords to canvas coords
        const scale = stage.scaleX();
        const stagePos = stage.position();
        const x = (pointer.x - stagePos.x) / scale;
        const y = (pointer.y - stagePos.y) / scale;

        addShape(activeTool as any, x, y);
      }
    },
    [activeTool, selectShape, addShape, stageRef]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedShapeId) {
          deleteShape(selectedShapeId);
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
        }
        if (e.key === 'd') {
          e.preventDefault();
          if (selectedShapeId) {
            duplicateShape(selectedShapeId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShapeId, deleteShape, undo, redo, duplicateShape]);

  // Set initial stage position and scale
  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.scale({ x: zoom, y: zoom });
    stageRef.current.position({ x: panX, y: panY });
  }, []);

  // Sort shapes by zIndex
  const sortedShapes = [...layout.shapes].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-950 overflow-hidden"
    >
      <Stage
        ref={stageRef}
        width={containerRef.current?.clientWidth || 1200}
        height={containerRef.current?.clientHeight || 800}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onDragEnd={handleStageDragEnd}
        draggable={activeTool === 'select'}
        scale={{ x: zoom, y: zoom }}
        position={{ x: panX, y: panY }}
      >
        <Layer>
          {/* Background rect */}
          <Rect
            x={0}
            y={0}
            width={layout.venueWidth}
            height={layout.venueHeight}
            fill="#1a1a1a"
          />
        </Layer>

        <GridLayer />

        <Layer>
          {sortedShapes.map((shape) => (
            <ShapeItem
              key={shape.id}
              shape={shape}
              isViolating={violatingIds.has(shape.id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
