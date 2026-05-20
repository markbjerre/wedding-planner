# Kostald venue — Forsamlingsrum

**Last updated:** 2026-05  
**Status:** Authoritative (verified on-site + Kostald plan, May 2026)  
**Reference drawing:** `tmp/venue-floor-plan.html` (open locally; Playwright: `e2e/venue-floor-plan.spec.ts`)

## Summary

Wedding reception layout for **Kostald** at Grønnessegaard. Default app layout: `KOSTALD_LAYOUT` in `src/data/kostald-layout.ts`.

| Zone | Size | Notes |
|------|------|--------|
| **Width** | **13.6 m** | Pillar bay: 2.8 / 4 / 4 / 2.8 m |
| **Clear hall** | **24 m** | Depot bottom → rear-room divider (excludes both) |
| **Køkken** | 13.6 × **7.03 m** | Above hall (from Kostald PDF) |
| **Depots** × 2 | **4.8 × 3.8 m** | Flank corridor at hall top (0.4 m inset) |
| **Pillars** | **5 × 3 = 15** | 4 m row spacing |
| **Dance floor** | **8 × 8 m** | Rows 2–3 (2×2 bays), cols 0–1 |

## Width (short axis)

| Segment | m |
|---------|---|
| Wall → pillar 1 | 2.8 |
| Pillar 1 → 2 | 4.0 |
| Pillar 2 → 3 | 4.0 |
| Pillar 3 → wall | 2.8 |
| **Total** | **13.6** |

Pillar centres X: **2.8, 6.8, 10.8**

## Length (long axis) — 24 m clear hall

Measured from **depot bottom** (y = 4.2 m) to **rear-room divider line** (y = 28.2 m). Depots and divider strip are **not** included in the 24 m.

| Segment | m |
|---------|---|
| Depot bottom → 1st pillar row | 4.0 |
| Between pillar rows (×4) | 4.0 each |
| Last pillar row → divider | 4.0 |
| **Total clear** | **24.0** |

End margins use **4 m** for now (target **3.7 m** when confirmed on site).

Pillar row centres Y (from hall top): **8.2, 12.2, 16.2, 20.2, 24.2**

## Dance floor

- **Position:** pillar rows **2–3**, columns **0–1**
- **Top-left corner:** (2.8 m, 16.2 m) in hall coordinates
- **Size:** 8 × 8 m (two 4 m bays each way)
- Constant: `KOSTALD_DANCE_FLOOR_FIRST_ROW = 2` in `kostald-venue.ts`

## Stack (top → bottom)

```
KØKKEN          7.03 m
─────────────────────────
DEPOT | corridor | DEPOT   (top of hall, y = 0.4–4.2)
FORSAMLINGSRUM  24 m clear  (pillars + open floor)
───────────────────────── rear-room divider (y = 28.2)
Rear rooms      3.1 m deep (sketch; not in app canvas)
```

App canvas height: **7.03 + 28.2 = 35.23 m** (kitchen + hall through divider).

## Code entry points

| File | Purpose |
|------|---------|
| `src/data/kostald-venue.ts` | Dimensions, pillar maths, dance-floor row |
| `src/data/kostald-layout.ts` | `KOSTALD_LAYOUT` + shape builder |
| `src/data/accommodation-seed.ts` | Grønnessegaard sleeping rooms (merged into default) |
| `src/data/kostald-venue.test.ts` | Unit tests |
| `e2e/kostald-venue.spec.ts` | App layout (localStorage) |
| `e2e/venue-floor-plan.spec.ts` | HTML reference plan |

Default layout loads when localStorage is empty (`editor-store.ts`). Clear cache to reset:

```js
localStorage.removeItem('wedding-planner-layout:self');
location.reload();
```

## Archived PDF

Full-building `Kostald-1_250.pdf` (15.5 × 62.85 m) remains in `KOSTALD_PDF_MEASURED` for comparison only. Table planning uses the sketch hall module above.

## Related

- [CLI.md](./CLI.md) — export / validate layout JSON
- [INDEX.md](./INDEX.md) — doc index
