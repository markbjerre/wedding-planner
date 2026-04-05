# Wedding Planner

A frontend-only 2D wedding venue layout editor with guest list tracking and room planning.

![Tech stack](https://img.shields.io/badge/React_18-TypeScript-blue) ![Konva.js](https://img.shields.io/badge/Canvas-Konva.js-orange) ![Zustand](https://img.shields.io/badge/State-Zustand-purple)

## Features

### Layout Editor (2D Canvas)
- Drag-and-drop shapes: round tables, rect tables, chairs, stage, dance floor, zones, decorations
- Pan (drag background) and zoom (scroll wheel, scales around pointer)
- Snap-to-grid with configurable grid size in **metres**
- Venue dimensions in metres with configurable px/m scale
- Minimum spacing enforcement (20px gap) with red violation highlights
- Keyboard shortcuts: `Delete` delete, `Ctrl+Z` undo, `Ctrl+Shift+Z` redo, `Ctrl+D` duplicate

### Layers
Four canvas layers, each independently controllable:
| Layer | Default shapes |
|-------|---------------|
| Floorplan | Zones, floor markings |
| Fixed Items | Stage, bar, dance floor |
| Tables | Round and rect tables |
| Decorations | Decorations, chairs |

- Toggle layer visibility (eye icon)
- Lock entire layer (lock icon) — locked layer shapes cannot be moved
- Active layer badge in toolbar

### Lock
- Per-shape lock toggle in the Properties panel
- Locked shapes display a lock indicator on canvas and are non-draggable
- Layer-level lock overrides individual shape draggability

### Guest List Tracker
- Filterable/sortable guest table with status badges (confirmed, declined, pending)
- Table assignment per guest
- Unseated guests highlighted
- Guest count overlay on tables in the canvas

### Room Planner
- Room cards with capacity bars
- Unassigned guest pool with drag-assign to rooms

### Save & Export
- Auto-persist to browser localStorage on every change
- Download/upload layout as JSON
- Export canvas as PNG or PDF (A3 landscape)
- **CLI (Node):** validate, inspect, normalize, and patch layout JSON — [`docs/CLI.md`](docs/CLI.md) (`npm run cli`)

---

## Getting Started

```bash
# Install dependencies (requires Node via nvm)
source ~/.nvm/nvm.sh && npm install

# Start dev server → http://localhost:5173
source ~/.nvm/nvm.sh && npm run dev

# Production build
source ~/.nvm/nvm.sh && npm run build

# Type-check
source ~/.nvm/nvm.sh && npx tsc --noEmit
```

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool / dev server |
| Konva.js / react-konva | 2D canvas rendering |
| Zustand | State management |
| Tailwind CSS 3 | Styling (stone/amber earthy palette) |
| jsPDF | PDF export |
| html-to-image | PNG export helper |

---

## Project Structure

```
src/
├── types/index.ts          # VenueShape, Guest, Room, Layout, LayerId types
├── store/editor-store.ts   # Zustand store — all state + actions + undo/redo
├── data/sample-layout.ts   # Demo layout loaded on first run
├── lib/
│   ├── ids.ts              # newId() generator
│   ├── snap.ts             # snap-to-grid helpers
│   ├── spacing.ts          # min-spacing violation detection
│   ├── storage.ts          # localStorage + JSON file I/O
│   └── export.ts           # PNG + PDF export
├── components/
│   ├── Canvas/
│   │   ├── EditorCanvas.tsx   # Konva Stage: pan, zoom, shape placement
│   │   ├── GridLayer.tsx      # grid overlay
│   │   └── ShapeItem.tsx      # per-shape renderer + Transformer
│   ├── Toolbar/
│   │   └── Toolbar.tsx        # tool buttons, zoom, view tabs, layer selector
│   └── Sidebar/
│       ├── Sidebar.tsx        # three-tab wrapper (Properties / Layers / Layout)
│       ├── PropertiesPanel.tsx # selected shape editor, lock toggle, layer assignment
│       ├── LayersPanel.tsx    # layer visibility + lock controls
│       └── LayoutPanel.tsx    # venue dimensions, save/load/export, stats
└── pages/
    ├── GuestsPage.tsx         # guest list tracker view
    └── RoomsPage.tsx          # sleeping room planner view
```

---

## Design

Earthy tones — Tailwind `stone` and `amber` palette. Warm cream canvas (`#f5f0e8`), smooth rounded corners, professional sidebar with tabbed navigation.

---

## Architecture Notes

- **Frontend-only** — no backend; all state in localStorage. Add FastAPI + PostgreSQL later if cross-device sync is needed.
- **Konva.js** chosen over Fabric.js for React-native integration and lighter footprint.
- **Zustand** over Redux — minimal boilerplate for editor state.
- **No URL routing** — view switching (`editor` / `guests` / `rooms`) is store state.
- **Scale:** configurable, default 40 px/m. Canvas size = `venueWidthM × scale`.
