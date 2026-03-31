import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editor-store';
import { downloadLayoutJSON, loadFromFile } from '../../lib/storage';
import { exportToPNG, exportToPDF } from '../../lib/export';
import { DimensionFlowPanel } from './DimensionFlowPanel';
import { CloudSyncPanel } from './CloudSyncPanel';
import { ShareProjectsPanel } from './ShareProjectsPanel';
import type Konva from 'konva';

interface LayoutPanelProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

const INPUT = 'w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400';
const LABEL = 'block text-xs font-medium text-stone-500 mb-1';
const BTN_PRIMARY = 'w-full h-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-sm font-medium transition-colors';
const BTN_SECONDARY = 'w-full h-9 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 text-sm font-medium transition-colors';

function numDraftInvalid(
  raw: string | null,
  min: number,
  max: number
): boolean {
  if (raw === null || raw.trim() === '') return false;
  const n = parseFloat(raw.replace(',', '.'));
  if (Number.isNaN(n)) return true;
  return n < min || n > max;
}

export function LayoutPanel({ stageRef }: LayoutPanelProps) {
  const layout           = useEditorStore((s) => s.layout);
  const guests           = useEditorStore((s) => s.layout.guests);
  const shapes           = useEditorStore((s) => s.layout.shapes);
  const rooms            = useEditorStore((s) => s.layout.rooms);
  const updateLayoutMeta = useEditorStore((s) => s.updateLayoutMeta);
  const setLayout        = useEditorStore((s) => s.setLayout);

  const [venueWDraft, setVenueWDraft] = useState<string | null>(null);
  const [venueHDraft, setVenueHDraft] = useState<string | null>(null);
  const [gridDraft, setGridDraft] = useState<string | null>(null);
  const [scaleDraft, setScaleDraft] = useState<string | null>(null);
  useEffect(() => {
    setVenueWDraft(null);
    setVenueHDraft(null);
    setGridDraft(null);
    setScaleDraft(null);
  }, [layout.id]);

  const handleLoadJSON = async () => {
    try { setLayout(await loadFromFile()); } catch (e) { console.error(e); }
  };

  const handleExportPNG = () => {
    if (stageRef.current) exportToPNG(stageRef.current, `${layout.name.replace(/\s+/g, '-')}.png`);
  };
  const handleExportPDF = () => {
    if (stageRef.current) exportToPDF(stageRef.current, `${layout.name.replace(/\s+/g, '-')}.pdf`);
  };

  const confirmedGuests = guests.filter((g) => g.status === 'confirmed').length;
  const unseatedGuests  = guests.filter((g) => !g.tableId).length;
  const tableShapes     = shapes.filter((s) => s.kind === 'round-table' || s.kind === 'rect-table');
  const totalSeats      = tableShapes.reduce((sum, s) => sum + s.seats, 0);

  return (
    <div className="p-4 space-y-5">
      <CloudSyncPanel />
      <ShareProjectsPanel />
      <DimensionFlowPanel />

      {/* ── Venue info ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Venue</h3>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Layout Name</label>
            <input type="text" value={layout.name}
              onChange={(e) => updateLayoutMeta({ name: e.target.value })}
              className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Venue Name</label>
            <input type="text" value={layout.venueName}
              onChange={(e) => updateLayoutMeta({ venueName: e.target.value })}
              className={INPUT} />
          </div>
        </div>
      </section>

      {/* ── Space dimensions ───────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Space Dimensions</h3>
        <p className="text-xs text-stone-400 mb-3">Set the real-world size of your venue in metres.</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className={LABEL}>Width (m)</label>
            <input
              type="text"
              inputMode="decimal"
              value={venueWDraft ?? String(layout.venueWidthM)}
              onFocus={() => setVenueWDraft(String(layout.venueWidthM))}
              onChange={(e) => {
                const v = e.target.value;
                setVenueWDraft(v);
                const n = parseFloat(v.replace(',', '.'));
                if (!Number.isNaN(n) && n >= 4 && n <= 200) {
                  updateLayoutMeta({ venueWidthM: n });
                }
              }}
              onBlur={() => setVenueWDraft(null)}
              className={`${INPUT}${
                numDraftInvalid(venueWDraft, 4, 200)
                  ? ' border-red-500 ring-1 ring-red-200'
                  : ''
              }`}
            />
          </div>
          <div>
            <label className={LABEL}>Height (m)</label>
            <input
              type="text"
              inputMode="decimal"
              value={venueHDraft ?? String(layout.venueHeightM)}
              onFocus={() => setVenueHDraft(String(layout.venueHeightM))}
              onChange={(e) => {
                const v = e.target.value;
                setVenueHDraft(v);
                const n = parseFloat(v.replace(',', '.'));
                if (!Number.isNaN(n) && n >= 4 && n <= 200) {
                  updateLayoutMeta({ venueHeightM: n });
                }
              }}
              onBlur={() => setVenueHDraft(null)}
              className={`${INPUT}${
                numDraftInvalid(venueHDraft, 4, 200)
                  ? ' border-red-500 ring-1 ring-red-200'
                  : ''
              }`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>Grid (m)</label>
            <input
              type="text"
              inputMode="decimal"
              value={gridDraft ?? String(layout.gridSizeM)}
              onFocus={() => setGridDraft(String(layout.gridSizeM))}
              onChange={(e) => {
                const v = e.target.value;
                setGridDraft(v);
                const n = parseFloat(v.replace(',', '.'));
                if (!Number.isNaN(n) && n >= 0.25 && n <= 5) {
                  updateLayoutMeta({ gridSizeM: n });
                }
              }}
              onBlur={() => setGridDraft(null)}
              className={`${INPUT}${
                numDraftInvalid(gridDraft, 0.25, 5)
                  ? ' border-red-500 ring-1 ring-red-200'
                  : ''
              }`}
            />
          </div>
          <div>
            <label className={LABEL}>Scale (px/m)</label>
            <input
              type="text"
              inputMode="decimal"
              value={scaleDraft ?? String(layout.scale)}
              onFocus={() => setScaleDraft(String(layout.scale))}
              onChange={(e) => {
                const v = e.target.value;
                setScaleDraft(v);
                const n = parseFloat(v.replace(',', '.'));
                if (!Number.isNaN(n) && n >= 10 && n <= 200) {
                  updateLayoutMeta({ scale: n });
                }
              }}
              onBlur={() => setScaleDraft(null)}
              className={`${INPUT}${
                numDraftInvalid(scaleDraft, 10, 200)
                  ? ' border-red-500 ring-1 ring-red-200'
                  : ''
              }`}
            />
          </div>
        </div>
        <div className="mt-2 px-2.5 py-2 bg-stone-100 rounded-lg text-xs text-stone-500">
          Canvas: {layout.venueWidthM * layout.scale} × {layout.venueHeightM * layout.scale} px
          &nbsp;|&nbsp; 1 m = {layout.scale} px
        </div>
      </section>

      <div className="h-px bg-stone-100" />

      {/* ── Save / Export ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Save & Export</h3>
        <div className="space-y-2">
          <button onClick={() => downloadLayoutJSON(layout)} className={BTN_PRIMARY}>Save JSON</button>
          <button onClick={handleLoadJSON} className={BTN_SECONDARY}>Load JSON</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExportPNG} className={BTN_SECONDARY}>Export PNG</button>
            <button onClick={handleExportPDF} className={BTN_SECONDARY}>Export PDF</button>
          </div>
        </div>
      </section>

      <div className="h-px bg-stone-100" />

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Stats</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Shapes',    value: shapes.length,      color: '' },
            { label: 'Guests',    value: guests.length,      color: '' },
            { label: 'Confirmed', value: confirmedGuests,    color: 'text-green-600' },
            { label: 'Tables',    value: tableShapes.length, color: '' },
            { label: 'Seats',     value: totalSeats,         color: '' },
            { label: 'Unseated',  value: unseatedGuests,     color: unseatedGuests > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Rooms',     value: rooms.length,       color: '' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border border-stone-100 px-3 py-2">
              <div className="text-xs text-stone-400">{label}</div>
              <div className={`text-lg font-semibold tabular-nums ${color || 'text-stone-800'}`}>{value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
