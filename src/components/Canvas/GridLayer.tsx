import { Layer, Line, Rect } from 'react-konva';
import { useEditorStore } from '../../store/editor-store';

export function GridLayer() {
  const showGrid  = useEditorStore((s) => s.showGrid);
  const layout    = useEditorStore((s) => s.layout);
  const { venueWidthM, venueHeightM, gridSizeM, scale } = layout;

  const width   = venueWidthM * scale;
  const height  = venueHeightM * scale;
  const gridPx  = gridSizeM * scale;

  if (!showGrid) return null;

  const verticals   = [];
  const horizontals = [];

  for (let x = 0; x <= width; x += gridPx) {
    verticals.push(
      <Line key={`v-${x}`} points={[x, 0, x, height]} stroke="#d6d3d1" strokeWidth={0.5} opacity={0.6} />
    );
  }
  for (let y = 0; y <= height; y += gridPx) {
    horizontals.push(
      <Line key={`h-${y}`} points={[0, y, width, y]} stroke="#d6d3d1" strokeWidth={0.5} opacity={0.6} />
    );
  }

  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={width} height={height} fill="#f5f0e8" />
      {verticals}
      {horizontals}
    </Layer>
  );
}
