# Wedding Planner — Claude Configuration

**Last updated:** 2026-03

## Workspace (Code Projects)

This repo is cloned at **`Code Projects/wedding-planner/`** on the dev machine. On Windows, use Node/npm directly (no `nvm` required): `npm install`, `npm run dev` → http://localhost:5173. The `source ~/.nvm/nvm.sh` lines below are for Linux/homelab shells.

---

## Type
Frontend-only SPA — 2D wedding venue layout editor + guest list tracker + room planner.
React 18 + TypeScript + Vite + Konva.js + Zustand + Tailwind CSS 3.

---

## CLI Commands

```bash
# ── Dev ─────────────────────────────────────────────────────────
source ~/.nvm/nvm.sh && npm run dev          # start dev server → http://localhost:5173
source ~/.nvm/nvm.sh && npm run build        # production build → dist/
source ~/.nvm/nvm.sh && npm run preview      # preview production build
source ~/.nvm/nvm.sh && npm run lint         # ESLint
source ~/.nvm/nvm.sh && tsc --noEmit         # type-check only (no emit)

# ── Layout JSON (file-based; no Supabase) ───────────────────────
npm run cli -- --help                        # validate | info | normalize | export | apply | get
# Full reference: docs/CLI.md

# ── Install ──────────────────────────────────────────────────────
source ~/.nvm/nvm.sh && npm install          # install all deps
source ~/.nvm/nvm.sh && npm install <pkg>    # add a package

# ── Git ──────────────────────────────────────────────────────────
# Always use GITHUB_TOKEN for pushes (SSH key not on GitHub):
git remote set-url origin https://x-access-token:${GITHUB_TOKEN}@github.com/markbjerre/wedding-planner.git
git push
git remote set-url origin https://github.com/markbjerre/wedding-planner.git
```

> **Node:** requires nvm — always `source ~/.nvm/nvm.sh` before npm commands on dobbybrain.

---

## Project Structure

```
wedding-planner/
├── CLAUDE.md                        # ← you are here
├── cli/index.ts                     # layout JSON CLI (npm run cli)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
└── src/
    ├── main.tsx                     # entry point
    ├── App.tsx                      # root layout (Toolbar + Canvas/Pages + Sidebar)
    ├── index.css                    # Tailwind directives
    ├── types/index.ts               # VenueShape, Guest, Room, Layout types
    ├── store/editor-store.ts        # Zustand store — all state + actions
    ├── data/sample-layout.ts        # placeholder demo layout
    ├── lib/
    │   ├── ids.ts                   # newId() generator
    │   ├── snap.ts                  # snap-to-grid helpers
    │   ├── spacing.ts               # min-spacing / violation detection
    │   ├── storage.ts               # localStorage + JSON file save/load
    │   ├── layoutMerge.ts           # parse/merge layout JSON (CLI + scripts)
    │   └── export.ts                # PNG + PDF export via Konva + jsPDF
    ├── components/
    │   ├── Canvas/
    │   │   ├── EditorCanvas.tsx     # Konva Stage: pan, zoom, shape placement
    │   │   ├── GridLayer.tsx        # grid overlay
    │   │   └── ShapeItem.tsx        # per-shape renderer + Transformer
    │   ├── Toolbar/
    │   │   └── Toolbar.tsx          # tool buttons, zoom, view tabs, toggles
    │   └── Sidebar/
    │       ├── Sidebar.tsx          # sidebar wrapper (3 tabs: Properties/Layers/Layout)
    │       ├── PropertiesPanel.tsx  # selected shape editor, lock toggle, layer assignment
    │       ├── LayersPanel.tsx      # layer visibility + lock controls
    │       └── LayoutPanel.tsx      # layout meta (metres), save/load/export
    └── pages/
        ├── GuestsPage.tsx           # guest list tracker view
        └── RoomsPage.tsx            # sleeping room planner view
```

---

## Architecture Overview

### Views (controlled by `store.view`)
| View | Component | Purpose |
|------|-----------|---------|
| `editor` | `EditorCanvas` | 2D canvas layout editor |
| `guests` | `GuestsPage` | Guest list + seating assignment |
| `rooms` | `RoomsPage` | Sleeping room planner |

### Canvas (Konva.js)
- **Pan:** drag on empty stage background
- **Zoom:** mouse wheel, scales around pointer
- **Shapes:** drag, resize, rotate (Konva Transformer), snap-to-grid on drag end
- **Keyboard:** `Delete`/`Backspace` → delete, `Ctrl+Z` → undo, `Ctrl+Shift+Z` → redo, `Ctrl+D` → duplicate
- **Spacing:** minimum 20px gap enforced; violations highlighted in red

### State (Zustand — `src/store/editor-store.ts`)
- Single store holds `layout`, selection, viewport, history, view
- All mutations call `saveToLocalStorage` automatically (auto-persist)
- Optional **Supabase** cloud sync: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, run `supabase/001_wedding_planner_layouts.sql`, sign in via Layout → Cloud sync; debounced upsert while logged in
- Undo/redo stack capped at 50 snapshots

### Shape kinds
`round-table` | `rect-table` | `chair` | `stage` | `dance-floor` | `zone` | `decoration`

### Data format
Layout is a plain JSON object (`Layout` type). Save/load via:
- Browser localStorage (auto)
- JSON file download/upload
- Supabase row per auth user (optional)
- PNG/PDF export of the canvas
- **CLI:** `npm run cli` — validate, `info`, `normalize`, `apply <patch.json>`, `get <path>` — see `docs/CLI.md`

---

## Key Design Decisions
- **Frontend-only** by default; **optional Supabase** (Postgres + Auth) for deployed cross-device persistence without running your own API
- **Konva.js** over Fabric.js — React-native integration, lighter, better for shapes/transforms
- **Zustand** over Redux/Context — minimal boilerplate, great for editor state
- **No React Router** — view switching is store state, no URL routing needed yet
- **Scale:** 40px = 1 metre by default; configurable via `layout.scale` (px/m)
- **Dimensions in metres:** `venueWidthM`, `venueHeightM`, `gridSizeM` — canvas px size computed as `widthM × scale`
- **Layers:** 4 layers (`floorplan`, `fixed`, `tables`, `decorations`), each with `visible` + `locked` flags; stored in `layout.layers[]`
- **Lock:** per-shape `shape.locked` bool + per-layer `layer.locked`; both checked before allowing drag

---

## Version History

### v0.4.0 — 2026-03 (layout JSON CLI)
- **CLI:** `npm run cli` — `validate`, `info`, `normalize`, `export`, `apply`, `get` on layout JSON files (`cli/index.ts`, `tsx`).
- **Library:** `src/lib/layoutMerge.ts` — `parseLayoutFromJsonText`, `mergeLayoutPatch`, `getAtPath` (shared with CLI).
- **Docs:** `docs/CLI.md`; Cursor skill `wedding-planner-cli` (workspace `.cursor/skills/`).

### v0.3.0 — 2026-03 (Fusion-style dimension lock)
- **Edge distance constraints:** `Layout.constraints[]` — gap in metres between axis-aligned edges of two shapes (rotation ignored; same AABB convention as `spacing.ts`).
- **Anchor A / driven B:** Shape B moves to satisfy the gap when anchor A moves or after apply; locked shapes or locked layers skip driving B.
- **Valid edge pairs:** horizontal `east↔west`, vertical `south↔north`.
- **Toolbar:** Dimension tool (⊕); **Layout** sidebar: wizard (pick A → edge → B → edge → gap in m) + list/remove locks; **Escape** or empty canvas click resets wizard step.
- **Canvas:** dashed amber constraint lines + label; Konva `ConstraintOverlay` (non-interactive).
- **Code:** `src/lib/constraints.ts` (geometry + satisfy), `DimensionFlowPanel.tsx`, `ConstraintOverlay.tsx`.

### v0.2.0 — 2026-03 (layers, lock, metric dimensions, earthy redesign)
- **Layers system:** 4 canvas layers (Floorplan, Fixed Items, Tables, Decorations)
  - Per-layer visibility toggle (eye icon) and lock toggle
  - Shapes assigned to a layer via `VenueShape.layer: LayerId`
  - `DEFAULT_LAYERS` defined in `types/index.ts`
- **Lock function:** per-shape lock toggle in PropertiesPanel; lock indicator rendered on canvas; locked shapes non-draggable
- **Metric dimensions:** venue size in metres (`venueWidthM`, `venueHeightM`, `gridSizeM`, `scale`)
  - LayoutPanel updated with metre inputs + live canvas size preview
  - GridLayer and EditorCanvas compute px dimensions from metres × scale
- **Earthy UI redesign:** Tailwind `stone`/`amber` palette throughout; warm cream canvas (`#f5f0e8`); smooth rounded corners
- **Sidebar tabbed interface:** Properties / Layers / Layout tabs (`SidebarTab` state in store)
- **Toolbar:** layer selector buttons, undo/redo buttons, earthy styling
- Build: zero TypeScript errors ✓

### v0.1.0 — 2026-03 (initial scaffold)
- Project scaffolded: Vite + React 18 + TypeScript + Tailwind CSS 3
- Dependencies: `konva`, `react-konva`, `zustand`, `react-router-dom`, `html-to-image`, `jspdf`
- Core types defined: `VenueShape`, `Guest`, `Room`, `Layout`, `EditorState`
- Zustand store with full CRUD for shapes, guests, rooms + undo/redo + auto-save
- Canvas: pan, zoom, snap-to-grid, spacing violation detection
- Shape rendering: round table, rect table, chair, stage, dance floor, zone, decoration
- Seat indicators on tables, guest count overlay, Konva Transformer for resize/rotate
- Toolbar: tool buttons, zoom controls, grid/snap/distance toggles, view tabs
- Sidebar: PropertiesPanel (edit selected shape), LayoutPanel (meta, stats, save/export)
- **Guest List tracker** (`GuestsPage`): filterable/sortable table, status badges, unseated highlight, table assignment
- **Room Planner** (`RoomsPage`): room cards with capacity bars, unassigned guest pool, guest assignment
- Save/load: localStorage auto-persist + JSON file download/upload
- Export: PNG (Konva `toDataURL`) + PDF (jsPDF A3 landscape)
- Sample demo layout with 7 shapes, 5 guests, 4 rooms preloaded
