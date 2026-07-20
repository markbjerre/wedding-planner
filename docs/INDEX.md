# wedding-planner — Documentation Index

**Last updated:** 2026-07

| Doc | Purpose |
|-----|---------|
| [../CLAUDE.md](../CLAUDE.md) | Entry point: commands, structure, architecture, version history |
| [../README.md](../README.md) | Features, getting started, tech stack |
| [WEDDING_PLANNER_MINIBOOK.md](./WEDDING_PLANNER_MINIBOOK.md) | Concept-first mini-book: Konva, Zustand, Layout JSON, constraints, deploy (EPUB-ready frontmatter) |
| [KOSTALD_VENUE.md](./KOSTALD_VENUE.md) | Kostald authoritative layout: 13.6 m × 24 m clear hall, 15 pillars, kitchen, depots, dance floor |
| [CLI.md](./CLI.md) | Layout JSON CLI: `npm run cli`, validate, apply patches, scripting |
| [DEPLOY_VPS.md](./DEPLOY_VPS.md) | Docker + Traefik deploy on ai-vaerksted.cloud |
| [SEATING_ADD_GUESTS.md](./SEATING_ADD_GUESTS.md) | Add late RSVPs to live seating without Reset (merge into `seating-state.json`) |

**Vendor handout:** `npm run handout:pdf` → `public/vendor-handout.pdf` (generator: `scripts/generate-vendor-handout.mjs`; layout setup in `src/data/vendor-handout-config.json`).

**Remote:** [github.com/markbjerre/wedding-planner](https://github.com/markbjerre/wedding-planner)

**Workspace:** `Code Projects/wedding-planner/` (see CLAUDE.md → Workspace).
