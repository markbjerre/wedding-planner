import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { gapPxBetweenEdges, gapPxRoomToShape, isValidEdgePair } from '../../lib/constraints';
import type { BoxEdge } from '../../types';

function DimensionValueStep({
  summary,
  suggestedM,
  onApply,
}: {
  summary: string;
  suggestedM: string;
  onApply: (distanceM: number) => void;
}) {
  const [distanceM, setDistanceM] = useState(() => suggestedM);
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-stone-600">{summary}</div>
      <label className="block text-xs font-medium text-stone-500">Gap (m)</label>
      <input
        type="number"
        min={0}
        step={0.01}
        value={distanceM}
        onChange={(e) => setDistanceM(e.target.value)}
        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800"
      />
      <button
        type="button"
        onClick={() => onApply(parseFloat(distanceM) || 0)}
        className="w-full h-9 rounded-lg border border-amber-600 bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
      >
        Apply dimension lock
      </button>
    </div>
  );
}

const EDGES: Array<{ id: BoxEdge; label: string }> = [
  { id: 'north', label: 'N' },
  { id: 'east', label: 'E' },
  { id: 'south', label: 'S' },
  { id: 'west', label: 'W' },
];

const BTN =
  'h-8 w-8 rounded-md border text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const BTN_IDLE = 'border-stone-200 bg-white text-stone-700 hover:bg-amber-50 hover:border-amber-300';

export function DimensionFlowPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const dimensionFlow = useEditorStore((s) => s.dimensionFlow);
  const layout = useEditorStore((s) => s.layout);
  const dimensionPickEdge = useEditorStore((s) => s.dimensionPickEdge);
  const addEdgeDistanceConstraint = useEditorStore((s) => s.addEdgeDistanceConstraint);
  const cancelDimensionFlow = useEditorStore((s) => s.cancelDimensionFlow);
  const removeConstraint = useEditorStore((s) => s.removeConstraint);
  const dimensionSelectRoomAnchor = useEditorStore((s) => s.dimensionSelectRoomAnchor);
  const selectedConstraintId = useEditorStore((s) => s.selectedConstraintId);
  const selectConstraint = useEditorStore((s) => s.selectConstraint);

  const activeLocksListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!selectedConstraintId || !activeLocksListRef.current) return;
    const el = activeLocksListRef.current.querySelector(
      `[data-constraint-id="${CSS.escape(selectedConstraintId)}"]`
    );
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedConstraintId]);

  const showWizard = activeTool === 'dimension' && dimensionFlow !== null;
  const step = dimensionFlow?.step ?? 'pickA';

  if (!showWizard && layout.constraints.length === 0) return null;
  const shapeA =
    dimensionFlow?.shapeAId != null
      ? layout.shapes.find((s) => s.id === dimensionFlow.shapeAId)
      : null;
  const shapeB =
    dimensionFlow?.shapeBId != null
      ? layout.shapes.find((s) => s.id === dimensionFlow.shapeBId)
      : null;

  const hint = (() => {
    if (!showWizard || !dimensionFlow) return '';
    if (step === 'pickA') {
      return 'Click a shape as anchor (A), or click inside the venue floor, or use “Room edge” below — then pick which wall (N/E/S/W).';
    }
    if (step === 'edgeA' && dimensionFlow.anchorAIsRoom) {
      return 'Choose which room wall is the anchor (venue boundary in Layout dimensions).';
    }
    if (step === 'edgeA') return `Choose which side of “${shapeA?.label ?? 'A'}” to measure from.`;
    if (step === 'pickB') return 'Click the driven shape (B) — it will move to keep the gap.';
    if (step === 'edgeB') return `Choose which side of “${shapeB?.label ?? 'B'}” faces the anchor.`;
    if (step === 'value') return 'Set the gap in metres and apply.';
    return '';
  })();

  return (
    <section className="mb-5 p-3 rounded-lg border border-amber-200 bg-amber-50/80">
      {showWizard && (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Dimension lock</h3>
            <button
              type="button"
              onClick={() => cancelDimensionFlow()}
              className="text-[10px] text-amber-700 hover:underline"
            >
              Reset step
            </button>
          </div>
          <p className="text-xs text-stone-600 mb-3 leading-relaxed">{hint}</p>
          <p className="text-[10px] text-stone-500 mb-2">
            Pairs: horizontal <strong>E↔W</strong>, vertical <strong>S↔N</strong> (axis-aligned boxes; rotation ignored).
            Room walls use the same labels (N = top of venue).
          </p>
          {step === 'pickA' && (
            <button
              type="button"
              onClick={() => dimensionSelectRoomAnchor()}
              className="mb-3 w-full h-8 rounded-lg border border-amber-300 bg-white text-amber-900 text-xs font-medium hover:bg-amber-50"
            >
              Room edge (venue wall) as anchor
            </button>
          )}
        </>
      )}

      {!showWizard && layout.constraints.length > 0 && (
        <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-2">Dimension locks</h3>
      )}

      {showWizard && step === 'edgeA' && (shapeA || dimensionFlow?.anchorAIsRoom) && (
        <div className="flex gap-1 flex-wrap">
          {EDGES.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`${BTN} ${BTN_IDLE}`}
              onClick={() => dimensionPickEdge(e.id)}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {showWizard && step === 'edgeB' && shapeB && dimensionFlow && dimensionFlow.edgeA !== null && (
        <div className="flex gap-1 flex-wrap">
          {EDGES.map((e) => {
            const ok = isValidEdgePair(dimensionFlow!.edgeA!, e.id);
            return (
              <button
                key={e.id}
                type="button"
                disabled={!ok}
                className={`${BTN} ${BTN_IDLE}`}
                onClick={() => dimensionPickEdge(e.id)}
                title={!ok ? 'Use E↔W or S↔N with anchor side' : ''}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      )}

      {showWizard &&
        step === 'value' &&
        shapeB &&
        dimensionFlow &&
        dimensionFlow.edgeA &&
        dimensionFlow.edgeB &&
        (dimensionFlow.anchorAIsRoom || shapeA) &&
        (() => {
          const vw = layout.venueWidthM * layout.scale;
          const vh = layout.venueHeightM * layout.scale;
          const g = dimensionFlow.anchorAIsRoom
            ? gapPxRoomToShape(vw, vh, dimensionFlow.edgeA, shapeB, dimensionFlow.edgeB)
            : shapeA
              ? gapPxBetweenEdges(shapeA, shapeB, dimensionFlow.edgeA, dimensionFlow.edgeB)
              : null;
          const suggestedM =
            g !== null ? Math.max(0, g / layout.scale).toFixed(3) : '1';
          const summary = dimensionFlow.anchorAIsRoom
            ? `Room (${dimensionFlow.edgeA} wall) → ${shapeB.label} (${dimensionFlow.edgeB})`
            : `${shapeA!.label} (${dimensionFlow.edgeA}) → ${shapeB.label} (${dimensionFlow.edgeB})`;
          return (
            <DimensionValueStep
              key={`${dimensionFlow.anchorAIsRoom ? 'room' : dimensionFlow.shapeAId}-${dimensionFlow.shapeBId}-${dimensionFlow.edgeA}-${dimensionFlow.edgeB}`}
              summary={summary}
              suggestedM={suggestedM}
              onApply={addEdgeDistanceConstraint}
            />
          );
        })()}

      <div className={`${showWizard ? 'mt-4 pt-3 border-t border-amber-200/80' : ''}`}>
        <h4 className="text-[10px] font-semibold text-stone-500 uppercase mb-2">Active locks</h4>
        {layout.constraints.length === 0 ? (
          <p className="text-xs text-stone-400">None yet.</p>
        ) : (
          <ul
            ref={activeLocksListRef}
            className="space-y-1.5 max-h-40 overflow-y-auto"
          >
            {layout.constraints.map((c, idx) => {
              const la =
                c.shapeAId === null
                  ? `Room · ${c.edgeA} wall`
                  : layout.shapes.find((s) => s.id === c.shapeAId)?.label ?? c.shapeAId;
              const lb = layout.shapes.find((s) => s.id === c.shapeBId)?.label ?? c.shapeBId;
              const aPart =
                c.shapeAId === null
                  ? la
                  : `${la} (${c.edgeA})`;
              const isSel = c.id === selectedConstraintId;
              return (
                <li
                  key={c.id}
                  data-constraint-id={c.id}
                  className={`flex items-start justify-between gap-2 text-xs rounded px-2 py-1.5 border transition-colors cursor-pointer ${
                    isSel
                      ? 'bg-amber-100 border-amber-400 ring-1 ring-amber-400/80'
                      : 'bg-white/80 border-stone-100 hover:bg-amber-50/80'
                  }`}
                  onClick={() => selectConstraint(c.id)}
                >
                  <span className="text-stone-700 min-w-0 flex-1">
                    <span className="font-mono text-stone-500 mr-1.5 shrink-0">#{idx + 1}</span>
                    <span className="break-words">
                      {aPart} → {lb} ({c.edgeB}) · <strong>{c.distanceM} m</strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConstraint(c.id);
                    }}
                    className="shrink-0 text-red-600 hover:underline text-[11px] pt-0.5"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
