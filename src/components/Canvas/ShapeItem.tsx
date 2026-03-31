import { useRef, useEffect, useCallback } from 'react';
import {
  Group,
  Circle,
  Rect,
  Text,
  Line,
  RegularPolygon,
  Transformer,
} from 'react-konva';
import { useEditorStore } from '../../store/editor-store';
import { snapPosition } from '../../lib/snap';
import { drivenAxesLocked } from '../../lib/constraints';
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
  const activeTool = useEditorStore((s) => s.activeTool);
  const dimensionTapShape = useEditorStore((s) => s.dimensionTapShape);

  const shapeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const dragOriginRef = useRef({ x: shape.x, y: shape.y });

  const constraints = layout.constraints ?? [];
  const { lockX, lockY } = drivenAxesLocked(shape.id, constraints);

  const isSelected = selectedShapeId === shape.id;
  const isInteractive = !shape.locked && !layerLocked;

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragStart = useCallback(() => {
    dragOriginRef.current = { x: shape.x, y: shape.y };
  }, [shape.x, shape.y]);

  const dragBoundFunc = useCallback(
    (pos: { x: number; y: number }) => ({
      x: lockX ? dragOriginRef.current.x : pos.x,
      y: lockY ? dragOriginRef.current.y : pos.y,
    }),
    [lockX, lockY]
  );

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    let x = e.target.x();
    let y = e.target.y();
    if (lockX) x = dragOriginRef.current.x;
    if (lockY) y = dragOriginRef.current.y;

    const gridSizeM = layout.gridSizeM;
    const scale = layout.scale;
    const gridSize = gridSizeM * scale;

    if (snapToGrid) {
      if (!lockX && !lockY) {
        const snapped = snapPosition(x, y, gridSize);
        x = snapped.x;
        y = snapped.y;
      } else if (lockX && !lockY) {
        const snapped = snapPosition(x, y, gridSize);
        y = snapped.y;
      } else if (!lockX && lockY) {
        const snapped = snapPosition(x, y, gridSize);
        x = snapped.x;
      }
      e.target.position({ x, y });
    }

    updateShape(shape.id, { x, y });
  };

  const handleTransformEnd = () => {
    if (!shapeRef.current) return;

    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    let x = node.x();
    let y = node.y();
    const rotation = node.rotation();

    if (lockX) x = shape.x;
    if (lockY) y = shape.y;

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

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (activeTool === 'dimension') {
      dimensionTapShape(shape.id);
      return;
    }
    selectShape(shape.id);
  };

  const assignedGuests = guests.filter((g) => g.tableId === shape.id);
  const assignedCount = assignedGuests.length;
  const sortedBySeat = [...assignedGuests].sort(
    (a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)
  );
  const maxNameLines = 6;
  const truncateName = (s: string, max: number) =>
    s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;
  const nameLines = sortedBySeat.slice(0, maxNameLines).map((g) =>
    truncateName(g.name, 16)
  );
  if (sortedBySeat.length > maxNameLines) {
    nameLines.push(`+${sortedBySeat.length - maxNameLines} more`);
  }
  const guestNamesText = nameLines.join('\n');
  /** Round table + round pillar share centred-circle layout for labels / lock. */
  const isRoundLayout =
    shape.kind === 'round-table' || shape.kind === 'pillar';
  const roundRadius = isRoundLayout
    ? Math.min(shape.width, shape.height) / 2
    : 0;

  const renderPrimitive = () => {
    const baseProps = {
      fill: shape.color,
      stroke: isViolating ? '#ef4444' : 'transparent',
      strokeWidth: isViolating ? 3 : 0,
    };

    switch (shape.kind) {
      case 'round-table': {
        // Circle matches min dimension so seats sit on the visible rim (width/height can differ slightly).
        const radius = Math.min(shape.width, shape.height) / 2;
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
        // Rect is top-left (0,0); group offset places shape centre at world x,y — seats must use same space.
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

              const cx = (sideIndex + 1) * spacing;
              const cy = isTop ? -14 : shape.height + 14;

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

      case 'wall':
        return (
          <Rect
            width={shape.width}
            height={shape.height}
            fill={shape.color}
            stroke="#334155"
            strokeWidth={2}
          />
        );

      case 'pillar': {
        const r = Math.min(shape.width, shape.height) / 2;
        return (
          <Circle
            radius={r}
            fill={shape.color}
            stroke={isViolating ? '#ef4444' : '#1e293b'}
            strokeWidth={isViolating ? 3 : 2}
          />
        );
      }

      case 'door': {
        const w = shape.width;
        const h = shape.height;
        return (
          <Group>
            <Rect
              width={w}
              height={h}
              fill={shape.color}
              stroke="#78350f"
              strokeWidth={2}
              cornerRadius={3}
            />
            <Line
              points={[w * 0.82, h * 0.12, w * 0.82, h * 0.88]}
              stroke="#fde68a"
              strokeWidth={Math.max(1.5, Math.min(w, h) * 0.04)}
              lineCap="round"
            />
            <Circle
              x={w * 0.74}
              y={h * 0.5}
              radius={Math.max(2, Math.min(w, h) * 0.035)}
              fill="#fde68a"
            />
          </Group>
        );
      }

      case 'item':
        return (
          <Rect
            width={shape.width}
            height={shape.height}
            fill={shape.color}
            stroke="#64748b"
            strokeWidth={1}
            dash={[8, 5]}
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
      dragBoundFunc={isInteractive && (lockX || lockY) ? dragBoundFunc : undefined}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onClick={handleClick}
      rotation={shape.rotation}
    >
      {/* Render the shape primitive */}
      {renderPrimitive()}

      {/* Label text */}
      <Text
        x={isRoundLayout ? -roundRadius : 0}
        y={isRoundLayout ? -roundRadius + 4 : 0}
        offsetX={0}
        offsetY={0}
        text={shape.label}
        fontSize={12}
        fill="white"
        fontFamily="sans-serif"
        align="center"
        verticalAlign="top"
        width={isRoundLayout ? roundRadius * 2 : shape.width}
        height={28}
      />

      {/* Guest names (serif, on-table) */}
      {(shape.kind === 'round-table' || shape.kind === 'rect-table') &&
        guestNamesText.length > 0 && (
          <Text
            x={shape.kind === 'round-table' ? -roundRadius : 0}
            y={
              shape.kind === 'round-table'
                ? -roundRadius * 0.35
                : Math.min(40, shape.height * 0.22)
            }
            width={
              shape.kind === 'round-table' ? roundRadius * 2 : shape.width
            }
            text={guestNamesText}
            fontSize={11}
            lineHeight={1.35}
            fill="#fef3c7"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontStyle="italic"
            align="center"
            shadowColor="rgba(0,0,0,0.45)"
            shadowBlur={5}
            shadowOffsetX={0}
            shadowOffsetY={1}
          />
        )}

      {/* Guest count for tables */}
      {(shape.kind === 'round-table' || shape.kind === 'rect-table') && (
        <Text
          x={shape.kind === 'round-table' ? -roundRadius : 0}
          y={
            shape.kind === 'round-table'
              ? roundRadius - 22
              : Math.max(shape.height - 20, 36)
          }
          offsetX={0}
          offsetY={0}
          text={`${assignedCount}/${shape.seats}`}
          fontSize={10}
          fill="#a8a29e"
          fontFamily="sans-serif"
          align="center"
          width={
            shape.kind === 'round-table' ? roundRadius * 2 : shape.width
          }
        />
      )}

      {/* Lock indicator when shape or layer is locked */}
      {(shape.locked || layerLocked) && (
        <Text
          x={
            isRoundLayout
              ? roundRadius - 14
              : shape.width - 22
          }
          y={
            isRoundLayout
              ? -roundRadius + 4
              : 4
          }
          text="🔒"
          fontSize={12}
          fill="#ffffff"
        />
      )}

      {/* Transformer for resize/rotate when selected (not in Dimension tool) */}
      {isSelected && isInteractive && activeTool === 'select' && (
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
