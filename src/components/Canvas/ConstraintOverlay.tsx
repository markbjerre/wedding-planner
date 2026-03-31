import { Group, Line, Text } from 'react-konva';
import { useEditorStore } from '../../store/editor-store';
import { constraintOverlayEndpoints } from '../../lib/constraints';
import type { BoxEdge, EdgeDistanceConstraint, VenueShape } from '../../types';
import type Konva from 'konva';

/**
 * Force segment to axis-aligned horizontal or vertical from edge pair.
 * Averages the stray coordinate so any legacy diagonal midpoint math becomes a true gap line.
 */
function snapEndpointsToAxis(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  edgeA: BoxEdge,
  edgeB: BoxEdge
): [{ x: number; y: number }, { x: number; y: number }] {
  const isH =
    (edgeA === 'east' || edgeA === 'west') &&
    (edgeB === 'east' || edgeB === 'west');
  const isV =
    (edgeA === 'north' || edgeA === 'south') &&
    (edgeB === 'north' || edgeB === 'south');
  if (isH) {
    const y = (p1.y + p2.y) / 2;
    return [{ x: p1.x, y }, { x: p2.x, y }];
  }
  if (isV) {
    const x = (p1.x + p2.x) / 2;
    return [{ x, y: p1.y }, { x, y: p2.y }];
  }
  return [p1, p2];
}

function ConstraintLine({
  c,
  shapes,
  scale,
  venueW,
  venueH,
  isSelected,
  listIndex,
  onSelect,
}: {
  c: EdgeDistanceConstraint;
  shapes: VenueShape[];
  scale: number;
  venueW: number;
  venueH: number;
  isSelected: boolean;
  /** 1-based index matching the sidebar list. */
  listIndex: number;
  onSelect: () => void;
}) {
  const b = shapes.find((s) => s.id === c.shapeBId);
  if (!b) return null;

  const seg = constraintOverlayEndpoints(c, shapes, venueW, venueH);
  if (!seg) return null;

  const [p1, p2] = snapEndpointsToAxis(seg.p1, seg.p2, c.edgeA, c.edgeB);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const label = `${c.distanceM.toFixed(2)} m`;
  /** Pixel length along the drawn segment — matches gap when constraint is satisfied. */
  const pxLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const pxLenM = pxLen / scale;

  const stopBubble = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
  };

  return (
    <Group>
      <Line
        points={[p1.x, p1.y, p2.x, p2.y]}
        stroke={isSelected ? '#c2410c' : '#b45309'}
        strokeWidth={isSelected ? 3 : 1.5}
        dash={isSelected ? [] : [6, 4]}
        opacity={isSelected ? 1 : 0.85}
        hitStrokeWidth={22}
        listening
        onMouseDown={stopBubble}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
      />
      <Text
        x={midX}
        y={midY - 10}
        text={label}
        fontSize={11}
        fill={isSelected ? '#9a3412' : '#92400e'}
        fontFamily="system-ui, sans-serif"
        padding={2}
        align="center"
        width={96}
        offsetX={48}
        listening={false}
      />
      {Math.abs(pxLenM - c.distanceM) > 0.05 && (
        <Text
          x={midX}
          y={midY + 6}
          text={`now ${pxLenM.toFixed(2)} m`}
          fontSize={9}
          fill="#b45309"
          fontFamily="system-ui, sans-serif"
          align="center"
          width={120}
          offsetX={60}
          listening={false}
        />
      )}
      <Text
        x={midX}
        y={midY - 24}
        text={`#${listIndex}`}
        fontSize={10}
        fontStyle="bold"
        fill={isSelected ? '#c2410c' : '#b45309'}
        fontFamily="system-ui, sans-serif"
        align="center"
        width={40}
        offsetX={20}
        listening={false}
      />
    </Group>
  );
}

export function ConstraintOverlay() {
  const layout = useEditorStore((s) => s.layout);
  const canvasLayerFilterIds = useEditorStore((s) => s.canvasLayerFilterIds);
  const selectedConstraintId = useEditorStore((s) => s.selectedConstraintId);
  const selectConstraint = useEditorStore((s) => s.selectConstraint);
  const constraints = layout.constraints ?? [];
  const venueW = layout.venueWidthM * layout.scale;
  const venueH = layout.venueHeightM * layout.scale;

  const visible = constraints.filter((c) => {
    const b = layout.shapes.find((s) => s.id === c.shapeBId);
    if (!b || !canvasLayerFilterIds.includes(b.layer)) return false;
    if (c.shapeAId === null) return true;
    const a = layout.shapes.find((s) => s.id === c.shapeAId);
    return a ? canvasLayerFilterIds.includes(a.layer) : false;
  });

  if (visible.length === 0) return null;

  return (
    <Group listening>
      {visible.map((c) => {
        const listIndex = constraints.findIndex((x) => x.id === c.id) + 1;
        return (
          <ConstraintLine
            key={c.id}
            c={c}
            shapes={layout.shapes}
            scale={layout.scale}
            venueW={venueW}
            venueH={venueH}
            isSelected={c.id === selectedConstraintId}
            listIndex={listIndex}
            onSelect={() => selectConstraint(c.id)}
          />
        );
      })}
    </Group>
  );
}
