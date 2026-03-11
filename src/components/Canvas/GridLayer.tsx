import { Layer, Line } from 'react-konva';
import { useEditorStore } from '../../store/editor-store';

export function GridLayer() {
  const showGrid = useEditorStore((s) => s.showGrid);
  const layout = useEditorStore((s) => s.layout);

  if (!showGrid) return null;

  const { venueWidth, venueHeight, gridSize } = layout;
  const lines = [];

  // Vertical lines
  for (let x = 0; x <= venueWidth; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, venueHeight]}
        stroke="#374151"
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= venueHeight; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, venueWidth, y]}
        stroke="#374151"
        strokeWidth={0.5}
        opacity={0.4}
      />
    );
  }

  return <Layer>{lines}</Layer>;
}
