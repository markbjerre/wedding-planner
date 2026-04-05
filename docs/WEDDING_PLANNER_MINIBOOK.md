---
title: "Wedding Planner"
subtitle: "Document-oriented layout, Konva, Zustand, and CAD-lite constraints in the browser"
author: "Claude"
date: "2026-04-05"
lang: en
toc: true
toc-depth: 2
---

## About This Book

This mini-book teaches how **wedding-planner** models a wedding venue as a **single JSON document**, renders it with a **2D canvas scene graph** (Konva), centralizes edits in **Zustand**, and optionally syncs to **Supabase**—plus a **CLI** that manipulates the same schema offline. You will understand canvas vs DOM, metre space vs pixel space, edge-distance constraints without a full CAD kernel, and the deployment pattern for a **Vite** SPA under a **subpath** on nginx/Traefik.

**Prerequisites:** Basic TypeScript and React; terminal comfort for `npm run cli`. No Konva or Zustand experience assumed.

---

## Chapter 1: The Big Picture

**wedding-planner** is a browser app for three intertwined jobs: sketch a **venue floor plan** (tables, walls, dance floor, decorations), track **guests** (groups, dietary notes, seat assignments), and allocate **sleeping rooms** (capacity, which guests stay where). Everything shares one serializable object—a **`Layout`**—so you can export one JSON file, email it, version it in git, or let the CLI validate and patch it in CI.

The editor is not DOM `<div>` layout. It is **Konva**: a stage, layers, shapes with transforms. That choice buys hit-testing, drag, rotate, and zoom at 60 fps for tens of objects—tasks that become awkward if every chair were a positioned div.

```text
┌─────────────────────────────────────────────────────────────┐
│                        React tree                            │
│  App.tsx                                                     │
│    ├── Toolbar                                               │
│    ├── EditorCanvas ──▶ Konva Stage ──▶ Layer ──▶ ShapeItem   │
│    ├── Sidebar (properties, layers, constraints, cloud)      │
│    └── GuestsPage / RoomsPage (tabular — DOM tables)         │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ Zustand: editor-store (Layout + UI + history)                 │
│   withSave ──▶ localStorage (per owner key)                   │
│             ──▶ remoteSaveQueue ──▶ Supabase (optional)       │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ Same JSON ──▶ CLI (cli/index.ts + layoutMerge.ts)             │
│            ──▶ file download/upload in browser                 │
└───────────────────────────────────────────────────────────────┘
```

*Figure 1: One Layout document feeds canvas, tables, CLI, and optional cloud.*

**One user action traced:** The user drags a round table. Konva fires drag events; React handlers call Zustand actions that update the shape’s `x`/`y` in the `Layout`. `withSave` wraps mutations: debounced **localStorage** write, optional **Supabase upsert** through `remoteSaveQueue`. **Spacing validation** runs against minimum distances; violating pairs highlight. **Undo** pops from an in-memory history stack (capped). If the user locks an **edge-to-edge distance** in metres, `constraints.ts` normalizes the layout and may move shapes to satisfy the gap—Fusion-style, axis-aligned bounding boxes, not a full geometric constraint solver.

Later chapters: **document-oriented editing**; **canvas scene graphs**; **Zustand** and persistence layers; **constraints**; **Vite `base`** and Docker/nginx; **CLI**; optional **Supabase**; lessons.

---

## Chapter 2: Architecture and Design Decisions

**Single document:** Guests, rooms, and shapes live together so export/import stays one step. Splitting into normalized SQL tables would need a backend migration story; the product optimizes for **one couple, one file, one truth**.

**View state without React Router:** `AppView` in Zustand switches `editor` / `guests` / `rooms`. `react-router-dom` is a dependency but routing is store-driven—fewer URL concerns for an internal tool, at the cost of no deep links.

**Supabase optional:** Build-time `VITE_SUPABASE_*` enables auth and row-per-user layout storage. Without env vars, the app remains local-first.

> **Author's Note:** If deep linking matters for support, add a thin router mapping `/guests` to store state without breaking the single-bundle deploy.

---

## Chapter 3: Document-Oriented Editors — Concept First

**Document-oriented** means the unit of work is a **file-shaped blob** (here, `Layout` JSON), not row-by-row database transactions. Google Docs is document-oriented; a bank ledger is not. Benefits: offline-first, trivial backups, human-readable diffs. Costs: merging concurrent edits is hard—this app assumes **one primary editor** or last-write-wins via Supabase timestamps.

Minimal TypeScript sketch of the idea:

```typescript
type Layout = {
  id: string;
  venueWidthM: number;
  venueHeightM: number;
  shapes: VenueShape[];
  guests: Guest[];
  rooms: Room[];
  version: number;
};
```

**In this project:** `src/types/index.ts` defines the real `Layout`, `VenueShape`, `Guest`, `Room`, layers, and `EdgeDistanceConstraint`. `normalizeLayout` in `src/lib/constraints.ts` repairs layer defaults and constraint consistency after edits or CLI patches.

---

## Chapter 4: Canvas Scene Graphs and Konva

The browser’s DOM is a tree of elements with **reflow** and **CSS**. A **canvas** is a bitmap with a separate model: you draw pixels (or WebGL), or you use a **scene graph** library that tracks objects, transforms, and hit regions.

**Konva** (and **react-konva**) provide Stage → Layer → shapes. Each node has `x`, `y`, `rotation`, `scale`. Events bubble in graph order. **Transformer** attaches resize handles—implemented in `ShapeItem` for selectable furniture.

**Mental model:** DOM is like arranging sticky notes on a corkboard where the building supervisor re-measures the wall on every move. Canvas is like a video game sprite system: you own the loop, you decide what redraws.

**In this project:** `src/components/Canvas/EditorCanvas.tsx` hosts the Stage, handles wheel zoom around the pointer, syncs pan, filters shapes by layer visibility, and overlays spacing violations. `GridLayer` draws the metre grid using `venueWidthM`, `venueHeightM`, and `gridSizeM`.

> **Key Insight:** Metres × `scale` (pixels per metre) converts model space to screen space. Export to PNG/PDF uses the same mapping via `html-to-image` and **jsPDF** in `src/lib/export.ts`.

---

## Chapter 5: Zustand and the Persistence Ladder

**Zustand** is minimal global state for React: a store created with `create()`, selectors, and actions. No boilerplate reducers unless you want them. **withSave** (pattern in `editor-store.ts`) wraps actions so every mutation triggers **localStorage** and queues **remote** saves.

Persistence ladder:

1. **localStorage** — `wedding-planner-layout:<ownerKey>`; legacy key migration for `self` in `storage.ts`.
2. **File** — download/upload JSON; identical schema to cloud.
3. **Supabase** — `upsertRemoteLayout` / `fetchRemoteLayout` in `remoteLayout.ts` when authenticated.

```typescript
// Minimal pattern: persist inside the action after computing next state
import { create } from 'zustand';

const useStore = create<{ n: number; bump: () => void }>((set, get) => ({
  n: 0,
  bump: () =>
    set(() => {
      const next = { n: get().n + 1 };
      localStorage.setItem('demo', JSON.stringify(next.n));
      return next;
    }),
}));
```

The real `editor-store.ts` adds debouncing, owner keys, remote queueing, and `normalizeLayout`—same idea at larger scale.

**In this project:** The actual `editor-store.ts` wires history (undo/redo cap 50), shape defaults, and `normalizeLayout` after structural edits. `initCloudSaveListeners()` in `main.tsx` connects Supabase auth events to the remote queue.

> **Watch Out:** `VITE_*` vars bake in at **build time**. Rotating Supabase keys requires rebuilding the Docker image or static bundle.

---

## Chapter 6: Edge-Distance Constraints — CAD-lite

Full CAD kernels solve arbitrary geometric constraints. This app implements **axis-aligned edge-to-edge distances** in **metres** between bounding boxes; round tables and pillars use circle-like bbox rules documented in `constraints.ts`. Constraints can anchor to **venue walls** (`shapeAId` nullable).

**Workflow in UI:** “Fusion-style” dimension flow in the sidebar selects edges, enters a gap, and the solver adjusts positions—simpler than driving sketch dimensions in SolidWorks, but recognizable.

**In this project:** Read `src/lib/constraints.ts` for `normalizeLayout` and driven axes. `ConstraintOverlay` renders constraint hints on the canvas.

---

## Chapter 7: Vite, Subpath Deploy, and Docker

**Vite** bundles ES modules, dev server with HMR, and `base: '/wedding-planner/'` so asset URLs work behind a path prefix. **Traefik** on the VPS matches `PathPrefix`/strip behavior—this project **does not** strip the prefix; nginx must receive `/wedding-planner/assets/...` as in `deploy/nginx.conf`.

**Dockerfile:** Node builds static files into an **nginx** image; health JSON is served at `/wedding-planner/health`.

**In this project:** `vite.config.ts` may include a dev middleware for `health.json`; see comments there. `docs/DEPLOY_VPS.md` lists Supabase migration order and Traefik labels.

> **Author's Note:** README lines that say “frontend-only / no backend” are partially outdated—Supabase is an optional backend for sync. Treat docs as “no *mandatory* backend.”

---

## Chapter 8: CLI — Same Schema, Automation-Friendly

**`npm run cli -- validate layout.json`** runs `tsx cli/index.ts` with commands: `validate`, `info`, `normalize`, `export`, `apply`, `get`. Patches merge shallowly then normalize—see `docs/CLI.md` for PowerShell UTF-8 notes on Windows.

**In this project:** `src/lib/layoutMerge.ts` implements `parseLayoutFromJsonText`, `mergeLayoutPatch`, `getAtPath`. The CLI imports the same code the app uses for consistency.

---

## Chapter 9: Lessons, Gotchas, and Next Steps

**React version:** `package.json` may list React 19 while older prose says 18—trust the lockfile for support questions.

**Concurrent editing:** Real-time collaboration would need OT/CRDT or server arbitration; out of scope today.

**Next steps:** Read `docs/CLI.md` for batch edits. Run `npm run test` and `npm run test:e2e` before releases. For agent automation, see `.cursor/skills/wedding-planner-cli/SKILL.md`.

---

*End of mini-book.*
