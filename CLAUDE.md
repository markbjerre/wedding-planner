# Wedding Planner — Claude Configuration

**Last updated:** 2026-03

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
    │   └── export.ts                # PNG + PDF export via Konva + jsPDF
    ├── components/
    │   ├── Canvas/
    │   │   ├── EditorCanvas.tsx     # Konva Stage: pan, zoom, shape placement
    │   │   ├── GridLayer.tsx        # grid overlay
    │   │   └── ShapeItem.tsx        # per-shape renderer + Transformer
    │   ├── Toolbar/
    │   │   └── Toolbar.tsx          # tool buttons, zoom, view tabs, toggles
    │   └── Sidebar/
    │       ├── Sidebar.tsx          # sidebar wrapper
    │       ├── PropertiesPanel.tsx  # selected shape editor
    │       └── LayoutPanel.tsx      # layout meta, stats, save/load/export
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
- Undo/redo stack capped at 50 snapshots

### Shape kinds
`round-table` | `rect-table` | `chair` | `stage` | `dance-floor` | `zone` | `decoration`

### Data format
Layout is a plain JSON object (`Layout` type). Save/load via:
- Browser localStorage (auto)
- JSON file download/upload
- PNG/PDF export of the canvas

---

## Key Design Decisions
- **Frontend-only** — no backend; add FastAPI + PostgreSQL later if persistence across devices is needed
- **Konva.js** over Fabric.js — React-native integration, lighter, better for shapes/transforms
- **Zustand** over Redux/Context — minimal boilerplate, great for editor state
- **No React Router** — view switching is store state, no URL routing needed yet
- **Scale:** 40px = 1 metre (configurable via `layout.scale`)

---

## Version History

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
