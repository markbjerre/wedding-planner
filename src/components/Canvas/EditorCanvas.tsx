import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useEditorStore } from '../../store/editor-store';
import { GridLayer } from './GridLayer';
import { ShapeItem } from './ShapeItem';
import { ConstraintOverlay } from './ConstraintOverlay';
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
  const cancelDimensionFlow = useEditorStore((s) => s.cancelDimensionFlow);
  const dimensionSelectRoomAnchor = useEditorStore((s) => s.dimensionSelectRoomAnchor);
  const dimensionFlow = useEditorStore((s) => s.dimensionFlow);
  const selectConstraint = useEditorStore((s) => s.selectConstraint);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 900, h: 700 });

  // Compute actual canvas dimensions from metres
  const venueW = layout.venueWidthM * layout.scale;
  const venueH = layout.venueHeightM * layout.scale;

  const canvasLayerFilterIds = useEditorStore((s) => s.canvasLayerFilterIds);
  const layerLocked     = Object.fromEntries(layout.layers.map((l) => [l.id, l.locked]));

  const violations    = findSpacingViolations(layout.shapes);
  const violatingIds  = new Set(violations.flat().map((s) => s.id));

  // Shapes on layers included in the canvas filter (multi-select), sorted by zIndex
  const visibleShapes = [...layout.shapes]
    .filter((s) => canvasLayerFilterIds.includes(s.layer))
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
    () => {
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
      if (activeTool === 'dimension') {
        if (e.target.name() === 'venue-bg' && dimensionFlow?.step === 'pickA') {
          dimensionSelectRoomAnchor();
          return;
        }
        cancelDimensionFlow();
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
    [
      activeTool,
      selectShape,
      selectConstraint,
      addShape,
      stageRef,
      cancelDimensionFlow,
      dimensionSelectRoomAnchor,
      dimensionFlow?.step,
    ]
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
      if (e.key === 'Escape' && activeTool === 'dimension') {
        e.preventDefault();
        cancelDimensionFlow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedShapeId, layout.shapes, layerLocked, deleteShape, duplicateShape, undo, redo, activeTool, cancelDimensionFlow]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /** Two-finger pinch to zoom (mobile). */
  const pinchRef = useRef<{ dist0: number; z0: number } | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        pinchRef.current = null;
        return;
      }
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = { dist0: dist, z0: useEditorStore.getState().zoom };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const { dist0, z0 } = pinchRef.current;
      const next = Math.max(0.2, Math.min(4, z0 * (dist / dist0)));
      setZoom(next);
      e.preventDefault();
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [setZoom]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-stone-200 touch-none">
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        draggable={(activeTool === 'select' && !selectedShapeId) || activeTool === 'dimension'}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        style={{
          cursor:
            activeTool === 'select'
              ? 'default'
              : activeTool === 'dimension'
                ? 'crosshair'
                : 'crosshair',
        }}
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
          <ConstraintOverlay />
        </Layer>
      </Stage>
    </div>
  );
}
