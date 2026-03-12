import { useRef, useEffect } from 'react';
import {
  Group,
  Circle,
  Rect,
  Text,
  RegularPolygon,
  Transformer,
} from 'react-konva';
import { useEditorStore } from '../../store/editor-store';
import { snapPosition } from '../../lib/snap';
import type { VenueShape } from '../../types';
import type Konva from 'konva';

interface ShapeItemProps {
  shape: VenueShape;
  isViolating: boolean;
  layerLocked: boolean;
}

export function ShapeItem({ shape, isViolating, layerLocked }: ShapeItemProps) {
  const selectedShapeId = useEditorStore((s) => s.selectedShapeId);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const layout = useEditorStore((s) => s.layout);
  const guests = useEditorStore((s) => s.layout.guests);

  const updateShape = useEditorStore((s) => s.updateShape);
  const selectShape = useEditorStore((s) => s.selectShape);

  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const isSelected = selectedShapeId === shape.id;
  const isInteractive = !shape.locked && !layerLocked;

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    let x = e.target.x();
    let y = e.target.y();

    const gridSizeM = layout.gridSizeM;
    const scale = layout.scale;
    const gridSize = gridSizeM * scale;

    if (snapToGrid) {
      const snapped = snapPosition(x, y, gridSize);
      x = snapped.x;
      y = snapped.y;
      e.target.position({ x, y });
    }

    updateShape(shape.id, { x, y });
  };

  const handleTransformEnd = () => {
    if (!shapeRef.current) return;

    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const x = node.x();
    const y = node.y();
    const rotation = node.rotation();

    const newWidth = shape.width * scaleX;
    const newHeight = shape.height * scaleY;

    node.scaleX(1);
    node.scaleY(1);

    updateShape(shape.id, {
      x,
      y,
      width: newWidth,
      height: newHeight,
      rotation: rotation % 360,
    });
  };

  const handleClick = () => {
    selectShape(shape.id);
  };

  const assignedGuests = guests.filter((g) => g.tableId === shape.id);
  const assignedCount = assignedGuests.length;

  const renderPrimitive = () => {
    const baseProps = {
      fill: shape.color,
      stroke: isViolating ? '#ef4444' : 'transparent',
      strokeWidth: isViolating ? 3 : 0,
    };

    switch (shape.kind) {
      case 'round-table': {
        const radius = shape.width / 2;
        return (
          <>
            <Circle radius={radius} {...baseProps} />
            {Array.from({ length: shape.seats }).map((_, i) => {
              const angle = (i / shape.seats) * 2 * Math.PI - Math.PI / 2;
              const cx = Math.cos(angle) * (radius + 14);
              const cy = Math.sin(angle) * (radius + 14);
              return (
                <Circle
                  key={`seat-${i}`}
                  x={cx}
                  y={cy}
                  radius={7}
                  fill="#d6d3d1"
                  opacity={0.7}
                />
              );
            })}
          </>
        );
      }

      case 'rect-table': {
        return (
          <>
            <Rect
              width={shape.width}
              height={shape.height}
              {...baseProps}
            />
            {Array.from({ length: shape.seats }).map((_, i) => {
              const seatsPerSide = Math.ceil(shape.seats / 2);
              const isTop = i < seatsPerSide;
              const sideIndex = i % seatsPerSide;
              const spacing = shape.width / (seatsPerSide + 1);

              const cx = -shape.width / 2 + (sideIndex + 1) * spacing;
              const cy = isTop ? -shape.height / 2 - 14 : shape.height / 2 + 14;

              return (
                <Circle
                  key={`seat-${i}`}
                  x={cx}
                  y={cy}
                  radius={7}
                  fill="#d6d3d1"
                  opacity={0.7}
                />
              );
            })}
          </>
        );
      }

      case 'stage':
        return (
          <Rect
            width={shape.width}
            height={shape.height}
            fill="#78716c"
            stroke="#57534e"
            strokeWidth={2}
          />
        );

      case 'dance-floor':
        return (
          <Rect
            width={shape.width}
            height={shape.height}
            fill={shape.color}
            opacity={0.5}
          />
        );

      case 'zone':
        return (
          <Rect
            width={shape.width}
            height={shape.height}
            fill={shape.color}
            opacity={0.2}
            stroke={shape.color}
            strokeWidth={2}
            dash={[5, 5]}
          />
        );

      case 'chair':
        return (
          <Rect
            width={shape.width}
            height={shape.height}
            fill={shape.color}
            stroke="#a8a29e"
            strokeWidth={1}
          />
        );

      case 'decoration':
        return (
          <RegularPolygon
            sides={5}
            radius={shape.width / 2}
            fill={shape.color}
            stroke="transparent"
          />
        );

      default:
        return <Rect width={100} height={100} fill="#78716c" />;
    }
  };

  return (
    <Group
      ref={shapeRef}
      x={shape.x}
      y={shape.y}
      offsetX={shape.width / 2}
      offsetY={shape.height / 2}
      draggable={isInteractive}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onClick={handleClick}
      rotation={shape.rotation}
    >
      {/* Render the shape primitive */}
      {renderPrimitive()}

      {/* Label text */}
      <Text
        x={0}
        y={0}
        offsetX={0}
        offsetY={0}
        text={shape.label}
        fontSize={12}
        fill="white"
        fontFamily="sans-serif"
        align="center"
        verticalAlign="middle"
        width={shape.width}
        height={30}
      />

      {/* Guest count for tables */}
      {(shape.kind === 'round-table' || shape.kind === 'rect-table') && (
        <Text
          x={0}
          y={20}
          offsetX={0}
          offsetY={0}
          text={`${assignedCount}/${shape.seats}`}
          fontSize={10}
          fill="#a8a29e"
          fontFamily="sans-serif"
          align="center"
          width={shape.width}
        />
      )}

      {/* Lock indicator when shape or layer is locked */}
      {(shape.locked || layerLocked) && (
        <Text
          x={shape.width / 2 - 12}
          y={-shape.height / 2 + 2}
          text="🔒"
          fontSize={12}
          fill="#ffffff"
        />
      )}

      {/* Transformer for resize/rotate when selected */}
      {isSelected && isInteractive && (
        <Transformer
          ref={trRef}
          enabledAnchors={[
            'top-left',
            'top-center',
            'top-right',
            'middle-right',
            'middle-left',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ]}
          rotateEnabled={true}
          borderStroke="#b45309"
          anchorFill="#b45309"
          anchorSize={8}
          borderStrokeWidth={2}
        />
      )}
    </Group>
  );
}
