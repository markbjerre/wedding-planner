/**
 * Vendor handout PDF for catering & venue staff.
 *
 * Pages:
 *  1. Full hall floor plan (kitchen, tables, dance, bar) — A3 portrait
 *  2. Seating zoom with meal counts (A3) + A4 print copies
 *  3+. Catering — seat + food preference per country table
 *  Inventarliste overview (qty + item by category) — before final notes
 *  Last. Notes for catering & venue
 *
 * Layout source (easy to switch):
 *   src/data/vendor-handout-config.json  → setupId (A–J)
 *   tmp/kostald-setup-placements.json    → x/y + country name per table
 *
 * To move tables: edit positions (or swap names) in the chosen setup in
 * placements JSON, or change setupId in the config, then re-run this script.
 * Optionally sync SPA: node scripts/sync-dinner-plan-from-setup.mjs <id>
 *
 * Usage:
 *   npm run handout:pdf
 *   node scripts/generate-vendor-handout.mjs
 *   node scripts/generate-vendor-handout.mjs --setup J
 *
 * Writes: tmp/ + public/ vendor-handout.pdf (+ .html fallback)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const config = JSON.parse(
  readFileSync(resolve(root, 'src/data/vendor-handout-config.json'), 'utf8')
);
const setupArg = process.argv.find((a) => a.startsWith('--setup'));
const SETUP_ID = (
  setupArg ? setupArg.split('=')[1] || process.argv[process.argv.indexOf(setupArg) + 1] : null
) || config.setupId || 'I';

// ─── Venue (match kostald-venue / blueprint) ─────────────────────────────────
const W = 13.6;
const kitchen = 7.03;
const depotBottom = 4.2;
const d0 = 0.96;
const spacing = 4;
const rows = 6;
const d1 = 3.8;
const clear = d0 + (rows - 1) * spacing + d1;
const divider = depotBottom + clear;
const pillarXs = [2.8, 6.8, 10.8];
const pillarYs = Array.from({ length: rows }, (_, i) => depotBottom + d0 + i * spacing);
const danceX = 2.8;
const danceY = pillarYs[rows - 1] - 8;
const danceW = 8;
const danceH = 8;

const BAR = { x: W - 1.5 - 0.62, y: danceY, w: 0.62, h: 3.0, staff: 1.5 };

const placementsPath = resolve(root, config.placementsFile || 'tmp/kostald-setup-placements.json');
const placements = JSON.parse(readFileSync(placementsPath, 'utf8'));
const tables = placements.setups[SETUP_ID];
if (!tables?.length) {
  throw new Error(
    `Missing setup "${SETUP_ID}" in ${config.placementsFile}. Run: node scripts/generate-kostald-blueprint.mjs`
  );
}

const kitchenMd = readFileSync(
  resolve(root, config.kitchenListFile || 'tmp/kitchen-seat-list.md'),
  'utf8'
);

/** @returns {Map<string, {seat:string, guest:string, food:string}[]>} */
function parseKitchenList(md) {
  const map = new Map();
  let current = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)$/);
    if (h) {
      current = h[1].trim();
      if (!current.startsWith('Unassigned')) map.set(current, []);
      continue;
    }
    if (!current || current.startsWith('Unassigned')) continue;
    const row = line.match(/^\| (.+?) \| (.+?) \| (.+?) \|$/);
    if (!row || row[1].includes('Seat') || row[1].includes('---')) continue;
    const food = row[3].replace(/\*\*/g, '').trim();
    map.get(current).push({
      seat: row[1].trim(),
      guest: row[2].trim(),
      food,
    });
  }
  return map;
}

const byTable = parseKitchenList(kitchenMd);

/**
 * Non-serious RSVP jokes — treat as plain meal choice only (confirmed 2026-07-19).
 */
const JOKE_DIETARY = [
  /giv mig det hele/i,
  /allergic to everything except you/i,
  /pasta,\s*pizza/i, // kids-food note (Clara & Hugo) — not a kitchen allergy
];

function foodForCounts(raw) {
  const f = raw.replace(/\*\*/g, '').trim();
  if (JOKE_DIETARY.some((re) => re.test(f))) {
    return f.split('·')[0].trim(); // keep meat/fish/veg only
  }
  return f;
}

/**
 * Meal counts per table for the seating overview.
 * - meat / fish / vegetarian: primary RSVP choice
 * - specialDietary: gluten-free, allergy, “other” notes (any base meal)
 * Babies / no-meal excluded from all counts.
 */
function mealBreakdown(tableName) {
  const seats = byTable.get(tableName) || [];
  const out = { meat: 0, fish: 0, vegetarian: 0, specialDietary: 0 };
  for (const s of seats) {
    const f = foodForCounts(s.food).toLowerCase();
    if (!f || /no meal/.test(f)) continue;
    const base = f.split('·')[0].trim();
    if (base === 'vegetarian' || base === 'vegan') out.vegetarian += 1;
    else if (base === 'fish') out.fish += 1;
    else if (base === 'meat') out.meat += 1;
    if (f.includes('·') || /gluten|allerg|lactose|n[øo]dde|\bnut\b|other/.test(f)) {
      out.specialDietary += 1;
    }
  }
  return out;
}

function specialCountForTable(tableName) {
  const b = mealBreakdown(tableName);
  return b.fish + b.vegetarian + b.specialDietary;
}

/** Serious dietary notes with guest names (for page-2 overview). */
function dietaryNotesForTable(tableName) {
  const seats = byTable.get(tableName) || [];
  const out = [];
  for (const s of seats) {
    const raw = s.food.replace(/\*\*/g, '').trim();
    if (JOKE_DIETARY.some((re) => re.test(raw))) continue;
    const f = raw.toLowerCase();
    if (!f || /no meal/.test(f)) continue;
    if (!(f.includes('·') || /gluten|allerg|lactose|n[øo]dde|\bnut\b|other/.test(f))) {
      continue;
    }
    // Prefer the note after meal type: "meat · gluten-free" → "gluten-free"
    const parts = raw.split('·').map((p) => p.trim());
    const note =
      parts.length > 1
        ? parts
            .slice(1)
            .join(' · ')
            .replace(/^other\s*·\s*/i, '')
            .trim()
        : raw;
    out.push({ guest: s.guest, note: note || raw, food: raw });
  }
  return out;
}

/** Guests with non-plain-meat needs (for catering detail pages). */
function specialsForTable(tableName) {
  const seats = byTable.get(tableName) || [];
  return seats
    .filter((s) => {
      const f = foodForCounts(s.food).toLowerCase();
      if (!f || /no meal/.test(f)) return false;
      const base = f.split('·')[0].trim();
      if (base === 'meat' && !f.includes('·')) return false;
      return true;
    })
    .map((s) => ({
      guest: s.guest,
      food: foodForCounts(s.food),
      seat: s.seat,
    }));
}

// ─── PDF helpers ─────────────────────────────────────────────────────────────
function setFill(doc, hex) {
  const n = hex.replace('#', '');
  doc.setFillColor(
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16)
  );
}
function setDraw(doc, hex) {
  const n = hex.replace('#', '');
  doc.setDrawColor(
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16)
  );
}
function setText(doc, hex) {
  const n = hex.replace('#', '');
  doc.setTextColor(
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16)
  );
}

/** Draw bar + bartender strip with a readable callout (not rotated micro-text). */
function drawBarWithLabel(doc, X, Y, S) {
  setFill(doc, 'fde68a');
  setDraw(doc, 'ca8a04');
  doc.setLineWidth(0.3);
  doc.rect(X(W - BAR.staff), Y(BAR.y), S(BAR.staff), S(BAR.h), 'FD');
  setFill(doc, '92400e');
  setDraw(doc, '78350f');
  doc.rect(X(BAR.x), Y(BAR.y), S(BAR.w), S(BAR.h), 'FD');

  // Callout to the left of the bar (readable at any zoom)
  const cx = X(BAR.x) - 2;
  const cy = Y(BAR.y + BAR.h / 2);
  setDraw(doc, '92400e');
  doc.setLineWidth(0.45);
  doc.line(X(BAR.x), cy, cx - 1, cy);
  setFill(doc, 'fff7ed');
  setDraw(doc, '92400e');
  doc.setLineWidth(0.4);
  const boxW = 28;
  const boxH = 11;
  doc.roundedRect(cx - boxW, cy - boxH / 2, boxW, boxH, 1, 1, 'FD');
  setText(doc, '78350f');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BAR', cx - boxW / 2, cy - 1.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('3.00 × 0.62 m', cx - boxW / 2, cy + 2.2, { align: 'center' });
  doc.setFontSize(5.5);
  setText(doc, 'a16207');
  doc.text('staff 1.5 m → wall', cx - boxW / 2, cy + 4.8, { align: 'center' });
}

function drawFloorPlanPage(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  setText(doc, '0f172a');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Ella & Mark — Kostald floor plan', pageW / 2, 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(doc, '64748b');
  doc.text(
    `Country tables · setup ${SETUP_ID} · kitchen at top · catering & venue`,
    pageW / 2,
    20,
    { align: 'center' }
  );

  // Map includes kitchen (above hall join) through dance — centered, no legend
  const yMin = -kitchen;
  const yMax = danceY + danceH + 0.5;
  const hallH = yMax - yMin;
  const frameY = 26;
  const contentW = pageW - margin * 2;
  const contentH = pageH - frameY - 14;
  const scale = Math.min(contentW / W, contentH / hallH);
  const mapW = W * scale;
  const mapH = hallH * scale;
  const ox = margin + (contentW - mapW) / 2;
  const oy = frameY + (contentH - mapH) / 2;

  const X = (x) => ox + x * scale;
  const Y = (y) => oy + (y - yMin) * scale;
  const S = (m) => m * scale;

  // Outer frame
  setFill(doc, 'f5f0e8');
  setDraw(doc, 'a8a29e');
  doc.setLineWidth(0.3);
  doc.rect(X(0), Y(yMin), S(W), S(hallH), 'FD');

  // Kitchen (top of drawing — service / plating side)
  setFill(doc, 'fef3c7');
  setDraw(doc, 'b45309');
  doc.setLineWidth(0.5);
  doc.rect(X(0), Y(-kitchen), S(W), S(kitchen), 'FD');
  setText(doc, '92400e');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('KITCHEN / KØKKEN', X(W / 2), Y(-kitchen / 2) - 1, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('13.6 × 7.03 m · plating & service', X(W / 2), Y(-kitchen / 2) + 5, {
    align: 'center',
  });

  // Hall / depot join line
  setDraw(doc, '334155');
  doc.setLineWidth(0.35);
  doc.line(X(0), Y(0), X(W), Y(0));

  // Depots
  setFill(doc, 'e7e5e4');
  setDraw(doc, 'a8a29e');
  doc.setLineWidth(0.25);
  doc.rect(X(0.4), Y(0.4), S(4.8), S(3.8), 'FD');
  doc.rect(X(8.4), Y(0.4), S(4.8), S(3.8), 'FD');
  setText(doc, '78716c');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DEPOT', X(2.8), Y(2.3), { align: 'center' });
  doc.text('DEPOT', X(10.8), Y(2.3), { align: 'center' });
  doc.setFont('helvetica', 'normal');

  // Seating zone tint
  setFill(doc, 'dcfce7');
  doc.setGState(new doc.GState({ opacity: 0.35 }));
  doc.rect(X(0.15), Y(depotBottom), S(W - 0.3), S(danceY - depotBottom), 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Dance
  setFill(doc, '1c4966');
  doc.setGState(new doc.GState({ opacity: 0.2 }));
  doc.rect(X(danceX), Y(danceY), S(danceW), S(danceH), 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  setDraw(doc, '1c4966');
  doc.setLineWidth(0.5);
  doc.rect(X(danceX), Y(danceY), S(danceW), S(danceH), 'D');
  setText(doc, '1c4966');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DANCE FLOOR', X(danceX + danceW / 2), Y(danceY + danceH / 2) - 2, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('8 × 8 m', X(danceX + danceW / 2), Y(danceY + danceH / 2) + 4, {
    align: 'center',
  });

  // Bartender + bar
  setFill(doc, 'fde68a');
  doc.rect(X(W - BAR.staff), Y(BAR.y), S(BAR.staff), S(BAR.h), 'F');
  setFill(doc, '92400e');
  doc.rect(X(BAR.x), Y(BAR.y), S(BAR.w), S(BAR.h), 'F');
  setText(doc, 'fff7ed');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('BAR', X(BAR.x + BAR.w / 2), Y(BAR.y + BAR.h / 2), {
    align: 'center',
    angle: 90,
  });

  // Pillars
  setFill(doc, '64748b');
  for (const px of pillarXs) {
    for (const py of pillarYs) {
      if (py > yMax) continue;
      doc.circle(X(px), Y(py), S(0.18), 'F');
    }
  }

  // Tables — country names only (special-food detail is on page 2)
  for (const t of tables) {
    const r = 0.68;
    setFill(doc, 'fff7ed');
    setDraw(doc, 'b45309');
    doc.setLineWidth(0.6);
    doc.circle(X(t.x), Y(t.y), S(r), 'FD');
    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    const fs = t.name.length > 10 ? 7 : 8.5;
    doc.setFontSize(fs);
    doc.text(t.name.toUpperCase(), X(t.x), Y(t.y) + 1.2, { align: 'center' });
  }

  // Frame border
  setDraw(doc, '334155');
  doc.setLineWidth(0.4);
  doc.rect(X(0), Y(yMin), S(W), S(hallH), 'D');

  // Footer
  setText(doc, '94a3b8');
  doc.setFontSize(7);
  doc.text(
    `Generated ${new Date().toISOString().slice(0, 10)} · Page 1 — Full hall (portrait)`,
    pageW / 2,
    pageH - 5,
    { align: 'center' }
  );
}

/** Shared seating crop (kitchen-adjacent through tables). */
function seatingViewBounds() {
  const pad = 0.7;
  const ys = tables.map((t) => t.y);
  const yMin = Math.min(0.2, Math.min(...ys) - pad);
  const yMax = Math.max(...ys) + pad + 0.6;
  const xMin = 0;
  const xMax = W;
  const viewW = xMax - xMin;
  const viewH = yMax - yMin;
  const bannerH = Math.min(0.95, (Math.min(...ys) - yMin) * 0.5);
  return { yMin, yMax, xMin, xMax, viewW, viewH, bannerH, ys };
}

const MEAL_HEADERS = [
  { key: 'meat', label: 'M', full: 'meat', color: '78716c' },
  { key: 'fish', label: 'F', full: 'fish', color: '1d4ed8' },
  { key: 'vegetarian', label: 'V', full: 'veg', color: '166534' },
  { key: 'specialDietary', label: '!', full: 'diet', color: '991b1b' },
];

/**
 * Draw seating-zone map with meal counts on tables.
 * @param {{ nameFs?: number, mealFs?: number, tableR?: number }} fonts
 */
function drawSeatingMap(doc, ox, oy, scale, fonts = {}) {
  const nameFs = fonts.nameFs ?? 12;
  const nameFsLong = fonts.nameFsLong ?? 10;
  const mealFs = fonts.mealFs ?? 9.5;
  const dietFs = fonts.dietFs ?? 9;
  const tableR = fonts.tableR ?? 1.15;
  const { yMin, yMax, xMin, viewW, viewH, bannerH } = seatingViewBounds();

  const X = (x) => ox + (x - xMin) * scale;
  const Y = (y) => oy + (y - yMin) * scale;
  const S = (m) => m * scale;

  setFill(doc, 'f5f0e8');
  setDraw(doc, 'a8a29e');
  doc.setLineWidth(0.3);
  doc.rect(X(xMin), Y(yMin), S(viewW), S(viewH), 'FD');

  if (bannerH > 0.35) {
    setFill(doc, 'fef3c7');
    setDraw(doc, 'b45309');
    doc.setLineWidth(0.35);
    doc.rect(X(xMin + 0.15), Y(yMin + 0.08), S(viewW - 0.3), S(bannerH), 'FD');
    setText(doc, '92400e');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(11, nameFs));
    doc.text('↑  KITCHEN / KØKKEN', X(W / 2), Y(yMin + 0.08 + bannerH / 2) + 1.5, {
      align: 'center',
    });
  }

  setFill(doc, 'dcfce7');
  doc.setGState(new doc.GState({ opacity: 0.28 }));
  doc.rect(
    X(xMin),
    Y(Math.max(yMin + bannerH, depotBottom)),
    S(viewW),
    S(yMax - Math.max(yMin + bannerH, depotBottom)),
    'F'
  );
  doc.setGState(new doc.GState({ opacity: 1 }));

  if (0.4 + 3.8 > yMin && 0.4 < yMax) {
    setFill(doc, 'e7e5e4');
    setDraw(doc, 'a8a29e');
    doc.rect(X(0.4), Y(0.4), S(4.8), S(3.8), 'FD');
    doc.rect(X(8.4), Y(0.4), S(4.8), S(3.8), 'FD');
    setText(doc, '78716c');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DEPOT', X(2.8), Y(2.3), { align: 'center' });
    doc.text('DEPOT', X(10.8), Y(2.3), { align: 'center' });
  }

  if (danceY < yMax) {
    setDraw(doc, '1c4966');
    doc.setLineWidth(0.45);
    doc.line(X(0), Y(danceY), X(W), Y(danceY));
    setText(doc, '1c4966');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('dance floor →', X(W / 2), Y(danceY) + 4, { align: 'center' });
  }

  setFill(doc, '64748b');
  for (const px of pillarXs) {
    for (const py of pillarYs) {
      if (py < yMin - 0.2 || py > yMax + 0.2) continue;
      doc.circle(X(px), Y(py), S(0.18), 'F');
    }
  }

  for (const t of tables) {
    const b = mealBreakdown(t.name);
    setFill(doc, 'fff7ed');
    setDraw(doc, 'b45309');
    doc.setLineWidth(0.8);
    doc.circle(X(t.x), Y(t.y), S(tableR), 'FD');

    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(t.name.length > 10 ? nameFsLong : nameFs);
    const y0 = b.specialDietary > 0 ? -6.2 : -5.2;
    doc.text(t.name.toUpperCase(), X(t.x), Y(t.y) + y0, { align: 'center' });

    doc.setFontSize(mealFs);
    setText(doc, '57534e');
    doc.text(`${b.meat} meat`, X(t.x), Y(t.y) + y0 + 4.2, { align: 'center' });
    setText(doc, '1d4ed8');
    doc.text(`${b.fish} fish`, X(t.x), Y(t.y) + y0 + 8.0, { align: 'center' });
    setText(doc, '166534');
    doc.text(`${b.vegetarian} veg`, X(t.x), Y(t.y) + y0 + 11.8, { align: 'center' });
    if (b.specialDietary > 0) {
      setText(doc, '991b1b');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(dietFs);
      doc.text(`${b.specialDietary} diet`, X(t.x), Y(t.y) + y0 + 15.4, { align: 'center' });
    }
  }

  setDraw(doc, '334155');
  doc.setLineWidth(0.4);
  doc.rect(X(xMin), Y(yMin), S(viewW), S(viewH), 'D');
}

/** Meals-per-table grid. Returns next Y. */
function drawMealsGrid(doc, lx, startY, colW, opts = {}) {
  const titleFs = opts.titleFs ?? 11;
  const nameFs = opts.nameFs ?? 8.5;
  const numFs = opts.numFs ?? 10;
  const rowH = opts.rowH ?? 5.4;
  const nameW = opts.nameW ?? Math.min(42, colW * 0.38);
  const numW = (colW - nameW) / 4;
  let ly = startY;

  doc.setFont('helvetica', 'bold');
  setText(doc, '0f172a');
  doc.setFontSize(titleFs);
  doc.text('Meals per table', lx, ly);
  ly += 5;

  setFill(doc, 'f5f5f4');
  doc.rect(lx, ly - 3.2, colW, 9, 'F');
  setText(doc, '64748b');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Table', lx + 1, ly);
  MEAL_HEADERS.forEach((h, i) => {
    const cx = lx + nameW + numW * i + numW / 2;
    setFill(doc, h.color);
    doc.circle(cx, ly - 0.8, 2.4, 'F');
    setText(doc, 'ffffff');
    doc.setFontSize(7.5);
    doc.text(h.label, cx, ly + 0.3, { align: 'center' });
    setText(doc, h.color);
    doc.setFontSize(5.5);
    doc.text(h.full, cx, ly + 4.2, { align: 'center' });
  });
  ly += 8;

  setDraw(doc, 'e7e5e4');
  doc.setLineWidth(0.2);
  doc.line(lx, ly - 1.5, lx + colW, ly - 1.5);

  tables.forEach((t, idx) => {
    const b = mealBreakdown(t.name);
    if (idx % 2 === 1) {
      setFill(doc, 'fafaf9');
      doc.rect(lx, ly - 3.5, colW, rowH, 'F');
    }
    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameFs);
    doc.text(t.name, lx + 1, ly);
    doc.setFontSize(numFs);
    const vals = [b.meat, b.fish, b.vegetarian, b.specialDietary];
    vals.forEach((n, i) => {
      const cx = lx + nameW + numW * i + numW / 2;
      setText(doc, MEAL_HEADERS[i].color);
      doc.text(String(n), cx, ly, { align: 'center' });
    });
    ly += rowH;
  });

  return ly;
}

/**
 * Special dietary list. May call onNewPage() when running out of space.
 * onNewPage should return { ly, pageH } (or just a number for ly).
 * Returns { ly, skipped, dietTotal }.
 */
function drawDietaryList(doc, lx, startY, colW, pageH, opts = {}) {
  const onNewPage = opts.onNewPage;
  const guestFs = opts.guestFs ?? 8.5;
  const noteFs = opts.noteFs ?? 8;
  const titleFs = opts.titleFs ?? 11;
  let ly = startY;
  let curPageH = pageH;
  let skipped = 0;

  const ensureSpace = (need) => {
    if (ly + need <= curPageH - 12) return;
    if (!onNewPage) return;
    const next = onNewPage();
    if (next && typeof next === 'object') {
      ly = next.ly;
      curPageH = next.pageH;
      if (next.colW != null) colW = next.colW;
      if (next.lx != null) lx = next.lx;
    } else {
      ly = next;
    }
  };

  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  setText(doc, '991b1b');
  doc.setFontSize(titleFs);
  doc.text('Special dietary', lx, ly);
  ly += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(doc, '64748b');
  doc.text('Guest + requirement  (! column = diet count)', lx, ly);
  ly += 5;

  const dietBlocks = tables
    .map((t) => ({ name: t.name, items: dietaryNotesForTable(t.name) }))
    .filter((b) => b.items.length > 0);

  for (const block of dietBlocks) {
    ensureSpace(18);
    if (ly > curPageH - 16 && !onNewPage) {
      skipped += block.items.length;
      continue;
    }
    setFill(doc, 'fff7ed');
    setDraw(doc, 'b45309');
    doc.setLineWidth(0.25);
    doc.roundedRect(lx, ly - 3, colW, 4.2, 0.5, 0.5, 'FD');
    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${block.name}  (${block.items.length})`, lx + 1.5, ly);
    ly += 5;

    for (const item of block.items) {
      ensureSpace(14);
      if (ly > curPageH - 14 && !onNewPage) {
        skipped += 1;
        continue;
      }
      setText(doc, '0f172a');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(guestFs);
      const gLines = doc.splitTextToSize(item.guest, colW - 2);
      doc.text(gLines[0], lx + 1.5, ly);
      ly += 3.4;
      for (let i = 1; i < gLines.length; i++) {
        doc.text(gLines[i], lx + 1.5, ly);
        ly += 3.2;
      }
      setText(doc, '166534');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(noteFs);
      const nLines = doc.splitTextToSize(item.note, colW - 2);
      for (const line of nLines) {
        ensureSpace(6);
        if (ly > curPageH - 12 && !onNewPage) break;
        doc.text(line, lx + 1.5, ly);
        ly += 3.1;
      }
      ly += 2;
    }
    ly += 1.5;
  }

  return { ly, skipped, dietTotal: dietBlocks.reduce((n, b) => n + b.items.length, 0) };
}

/** Page 2 (A3 landscape): map + meals grid + dietary on one sheet. */
function drawSeatingDetailPage(doc) {
  doc.addPage('a3', 'landscape');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  setText(doc, '0f172a');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Seating zone — meal distribution', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, '64748b');
  doc.text('A3 · Kitchen ↑ top · each table shows meat / fish / vegetarian counts', margin, 17.5);

  const { viewW, viewH } = seatingViewBounds();
  const frameX = margin;
  const frameY = 21;
  const sideW = 118;
  const frameW = pageW - margin * 2 - sideW - 3;
  const frameH = pageH - frameY - 10;
  const scale = Math.min(frameW / viewW, frameH / viewH);
  const ox = frameX + (frameW - viewW * scale) / 2;
  const oy = frameY + (frameH - viewH * scale) / 2;

  drawSeatingMap(doc, ox, oy, scale);

  const lx = frameX + frameW + 3;
  const colW = pageW - margin - lx;
  let ly = drawMealsGrid(doc, lx, frameY, colW);

  ly += 3;
  setDraw(doc, 'd6d3d1');
  doc.setLineWidth(0.35);
  doc.line(lx, ly, lx + colW, ly);
  ly += 5;

  const { skipped, dietTotal } = drawDietaryList(doc, lx, ly, colW, pageH);
  console.log(
    `Page 2 (A3) sidebar: ${dietTotal} dietary guests, skipped=${skipped}, y≈end`
  );

  setText(doc, '94a3b8');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Page 2 — A3 landscape · seating map + meal grid + dietary', margin, pageH - 4);
}

/**
 * A4 print copies of page-2 content (split for readability).
 * 1) Landscape map  2+) Portrait meals grid + special dietary
 */
function drawSeatingDetailPagesA4(doc) {
  const { viewW, viewH } = seatingViewBounds();

  // ── A4 landscape: map only ───────────────────────────────────────────────
  doc.addPage('a4', 'landscape');
  {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;

    setFill(doc, '1e3a5f');
    doc.rect(0, 0, pageW, 11, 'F');
    setText(doc, 'ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('A4 PRINT — Seating map (same as page 2 drawing)', margin, 7.5);

    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Seating zone — meal distribution', margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(doc, '64748b');
    doc.text('Kitchen ↑ top · meat / fish / veg (+ diet when needed)', margin, 23);

    const frameY = 26;
    const frameW = pageW - margin * 2;
    const frameH = pageH - frameY - 8;
    const scale = Math.min(frameW / viewW, frameH / viewH);
    const ox = margin + (frameW - viewW * scale) / 2;
    const oy = frameY + (frameH - viewH * scale) / 2;

    drawSeatingMap(doc, ox, oy, scale, {
      nameFs: 11,
      nameFsLong: 9,
      mealFs: 8.5,
      dietFs: 8,
      tableR: 1.1,
    });

    setText(doc, '94a3b8');
    doc.setFontSize(7);
    doc.text('A4 landscape · map only · lists on next page(s)', margin, pageH - 3);
  }

  // ── A4 portrait: meals grid + dietary (may spill to more pages) ──────────
  const startListsPage = () => {
    doc.addPage('a4', 'portrait');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;

    setFill(doc, '1e3a5f');
    doc.rect(0, 0, pageW, 11, 'F');
    setText(doc, 'ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('A4 PRINT — Meals & special dietary (page 2 lists)', margin, 7.5);

    return { pageW, pageH, margin, contentTop: 18 };
  };

  let { pageW, pageH, margin, contentTop } = startListsPage();
  let colW = pageW - margin * 2;
  let ly = contentTop;

  setText(doc, '0f172a');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '64748b');
  doc.text('M = meat · F = fish · V = vegetarian · ! = special dietary', margin, ly);
  ly += 6;

  ly = drawMealsGrid(doc, margin, ly, colW, {
    titleFs: 13,
    nameFs: 10,
    numFs: 12,
    rowH: 6.2,
    nameW: 55,
  });

  ly += 4;
  setDraw(doc, 'd6d3d1');
  doc.setLineWidth(0.35);
  doc.line(margin, ly, margin + colW, ly);
  ly += 6;

  const { skipped, dietTotal } = drawDietaryList(doc, margin, ly, colW, pageH, {
    titleFs: 13,
    guestFs: 10,
    noteFs: 9.5,
    onNewPage: () => {
      setText(doc, '94a3b8');
      doc.setFontSize(7);
      doc.text('A4 portrait · meals & dietary (continued…)', margin, pageH - 4);
      ({ pageW, pageH, margin, contentTop } = startListsPage());
      colW = pageW - margin * 2;
      setText(doc, '64748b');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Special dietary (continued)', margin, contentTop);
      return { ly: contentTop + 6, pageH, colW, lx: margin };
    },
  });

  console.log(`A4 lists: ${dietTotal} dietary guests, skipped=${skipped}`);

  setText(doc, '94a3b8');
  doc.setFontSize(7);
  doc.text('A4 portrait · meals & special dietary', margin, pageH - 4);
}

function drawCateringPages(doc) {
  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  // Same order as floor plan (from placements) — easy when layout changes
  const countries = tables.map((t) => t.name);

  let pageIndex = 0;
  const perPage = 3;

  for (let i = 0; i < countries.length; i += perPage) {
    doc.addPage('a4', 'portrait');
    pageIndex++;
    const chunk = countries.slice(i, i + perPage);

    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Catering — seats & meals', margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(doc, '64748b');
    doc.text('Plating by country table name. Food preference from RSVP.', margin, 22);

    let y = 28;
    for (const name of chunk) {
      const seats = byTable.get(name) || [];
      setFill(doc, 'fff7ed');
      setDraw(doc, 'b45309');
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, pageW - margin * 2, 8, 1, 1, 'FD');
      setText(doc, '0f172a');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Table: ${name}`, margin + 3, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setText(doc, '78716c');
      const nSpecial = specialCountForTable(name);
      doc.text(
        `${seats.length} place(s) · ${nSpecial} special`,
        pageW - margin - 3,
        y + 5.5,
        { align: 'right' }
      );
      y += 11;

      // header
      setText(doc, '64748b');
      doc.setFontSize(7.5);
      doc.text('Seat', margin + 2, y);
      doc.text('Guest', margin + 16, y);
      doc.text('Food preference', margin + 95, y);
      y += 2;
      setDraw(doc, 'e7e5e4');
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageW - margin, y);
      y += 4;

      doc.setFontSize(8.5);
      for (const s of seats) {
        if (y > pageH - 18) {
          setText(doc, '94a3b8');
          doc.setFontSize(7);
          doc.text(`Catering · continued`, margin, pageH - 5);
          doc.addPage('a4', 'portrait');
          y = 16;
          setText(doc, '0f172a');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(`Table: ${name} (cont.)`, margin, y);
          y += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
        }
        setText(doc, '78716c');
        doc.text(String(s.seat), margin + 2, y);
        setText(doc, '0f172a');
        doc.setFont('helvetica', 'bold');
        const guestLines = doc.splitTextToSize(s.guest, 72);
        doc.text(guestLines[0], margin + 16, y);
        doc.setFont('helvetica', 'normal');
        setText(doc, '166534');
        const foodLines = doc.splitTextToSize(s.food, 88);
        doc.text(foodLines[0], margin + 95, y);
        y += 5.2 * Math.max(guestLines.length, foodLines.length, 1);
        if (foodLines.length > 1 || guestLines.length > 1) {
          // overflow lines
          for (let li = 1; li < Math.max(guestLines.length, foodLines.length); li++) {
            if (guestLines[li]) {
              setText(doc, '0f172a');
              doc.text(guestLines[li], margin + 16, y);
            }
            if (foodLines[li]) {
              setText(doc, '166534');
              doc.text(foodLines[li], margin + 95, y);
            }
            y += 4.5;
          }
        }
      }
      y += 6;
    }

    setText(doc, '94a3b8');
    doc.setFontSize(7);
    doc.text(`Catering page ${pageIndex}`, margin, pageH - 5);
  }

  // Inventarliste overview (qty + item), then notes
  drawInventarlistePages(doc);

  // Notes (only the agreed venue/catering bullets)
  doc.addPage('a4', 'portrait');
  setText(doc, '0f172a');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Instruktioner til køkken & venue', margin, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(doc, '334155');
  const body = [
    '• Finland er hovedbordet (brudepar + nærmeste familie).',
    '• Køkkenet er øverst på plantegningen (gul markering).',
    '• Side 1 = hele hallen; side 2 = zoom af siddeområdet med særlige madantal.',
    '• Baren står ved højre væg ved dansegulvet (under Guatemala), med 1,5 m personaleplads til væggen. Åbner efter middagen.',
    '• Der serveres hvidvin, rødvin, øl og sodavand (køleskab til self-service). Det ville være fint, hvis I løbende kan fylde køleskabet op fra kølerummet.',
  ];
  let y = 28;
  const maxW = 210 - margin * 2;
  for (const line of body) {
    const wrapped = doc.splitTextToSize(line, maxW);
    for (const w of wrapped) {
      doc.text(w, margin, y);
      y += 6.5;
    }
    y += 3;
  }
  setText(doc, '94a3b8');
  doc.setFontSize(7);
  doc.text('End of handout', margin, 297 - 5);
}

/** Venue inventarliste — Antal + Genstand only, by category (max 2 A4 pages). */
const INVENTAR_SECTIONS = [
  {
    category: 'Inventar — festsal',
    items: [
      [120, 'Polstrede stole'],
      [20, 'Runde borde (1,5 m diameter)'],
      [30, 'Små lysestager sølvplet'],
      [10, 'Kandelabre — 5 arme (i vinduer)'],
    ],
  },
  {
    category: 'Service',
    items: [
      [120, 'Store tallerkener 32 cm'],
      [120, 'Mellem tallerkener'],
      [120, 'Små tallerkener'],
      [120, 'Dybe tallerkener'],
      [150, 'Isglas sorbet'],
      [120, 'Kaffekop m/underkop'],
      [120, 'Forretskniv'],
      [120, 'Forretsgaffel'],
      [120, 'Middagskniv'],
      [120, 'Middagsgaffel'],
      [120, 'Spiseske'],
      [120, 'Dessertgaffel'],
      [120, 'Dessertske'],
      [120, 'Teske'],
      [15, 'Serveringsske'],
      [15, 'Sauceske'],
      [10, 'Serveringstang'],
      [120, 'Rødvinsglas'],
      [120, 'Hvidvinsglas'],
      [120, 'Dessertvinsglas'],
      [120, 'Portvinsglas'],
      [120, 'Champagneglas'],
      [70, 'Brandy- / Cognacsglas'],
      [120, 'Drinksglas 33 cl'],
      [120, 'Drinksglas 20 cl'],
      [15, 'Termokande — sort'],
      [5, 'Termokande — hvid'],
      [15, 'Sukkerskål'],
      [15, 'Mælkekander'],
      [12, 'Glasskål Ø12'],
      [12, 'Glasskål Ø17'],
      [1, 'Glasskål Ø20'],
      [1, 'Glasskål Ø22'],
      [1, 'Glasskål Ø25'],
      [20, 'Salt-peber sæt'],
      [25, 'Vandkarafler'],
      [24, 'Porcelænsskål 17×17'],
      [24, 'Porcelænsskål 20×20'],
      [15, 'Brødbakke'],
      [15, 'Sauceskål'],
      [6, 'Serveringsfade — stor'],
      [20, 'Serveringsfade — mellem'],
    ],
  },
  {
    category: 'Køkkenudstyr',
    items: [
      [1, 'Kværnsæt i køkken'],
      [1, 'Stegepande Ø40'],
      [1, 'Stegepande Ø29'],
      [1, 'Suppegryde 30 L'],
      [1, 'Gryde 15 L'],
      [1, 'Gryde 12 L'],
      [1, 'Gryde 5,5 L'],
      [1, 'Kasserolle 5 L'],
      [5, 'Skærebrætter'],
      [2, 'Bradepande'],
      [8, 'Gastrobakker'],
      [1, 'Målekande'],
      [2, 'Røreskål'],
      [2, 'Brødkniv'],
      [5, 'Kokkeknive'],
      [1, 'Skrællekniv'],
      [5, 'Grønsagsknive'],
      [3, 'Sakse'],
      [1, 'Stegegaffel'],
      [2, 'Spatel — lille'],
      [1, 'Spatel — stor'],
      [2, 'Rivejern'],
      [1, 'Si'],
      [3, 'Øser'],
      [2, 'Piskeris'],
      [4, 'Grydeske'],
      [1, 'Hvidløgspresser'],
      [1, 'Ostehøvl'],
      [1, 'Dåseåbner'],
      [10, 'Tjenerbakke'],
      [10, 'Indlæg til tjenerbakke'],
      [2, 'Tjenerværktøj'],
      [2, 'Proptrækkere'],
    ],
  },
  {
    category: 'Vaser',
    items: [
      [13, 'Vaser ass. str.'],
      [1, 'Vase ½ m høj'],
    ],
  },
];

function drawInventarlistePages(doc) {
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const gap = 6;
  const colW = (pageW - margin * 2 - gap) / 2;
  const qtyW = 14;
  const rowH = 4.55;
  const bottom = pageH - 10;

  const units = [];
  for (const sec of INVENTAR_SECTIONS) {
    units.push({ type: 'cat', label: sec.category });
    for (const [qty, name] of sec.items) {
      units.push({ type: 'item', qty, name });
    }
  }

  let pageIndex = 0;
  let unitIdx = 0;

  const startPage = () => {
    doc.addPage('a4', 'portrait');
    pageIndex += 1;
    setText(doc, '0f172a');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Inventarliste', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(doc, '64748b');
    doc.text('Antal · genstand  (venue inventory overview)', margin, 19.5);

    const headerY = 25;
    for (let c = 0; c < 2; c++) {
      const x = margin + c * (colW + gap);
      setFill(doc, '1e3a5f');
      doc.roundedRect(x, headerY - 3.5, colW, 6, 0.8, 0.8, 'F');
      setText(doc, 'ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Antal', x + 2, headerY);
      doc.text('Genstand', x + qtyW + 2, headerY);
    }
    return headerY + 5;
  };

  // Fill left column top→bottom, then right, then next page
  while (unitIdx < units.length && pageIndex < 2) {
    startPage();
    for (let col = 0; col < 2 && unitIdx < units.length; col++) {
      const x = margin + col * (colW + gap);
      let y = 30;
      let itemStripe = 0;
      while (unitIdx < units.length) {
        const u = units[unitIdx];
        const need = u.type === 'cat' ? 6.5 : rowH;
        if (y + need > bottom) break;

        if (u.type === 'cat') {
          if (itemStripe > 0) y += 1.2;
          setFill(doc, 'fef3c7');
          setDraw(doc, 'b45309');
          doc.setLineWidth(0.2);
          doc.roundedRect(x, y - 3.2, colW, 5.4, 0.6, 0.6, 'FD');
          setText(doc, '92400e');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(u.label, x + 2, y);
          y += 6.2;
          itemStripe = 0;
        } else {
          if (itemStripe % 2 === 1) {
            setFill(doc, 'f8fafc');
            doc.rect(x, y - 3.2, colW, rowH, 'F');
          }
          setText(doc, '0f172a');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(String(u.qty), x + qtyW - 1, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          setText(doc, '334155');
          const nameLines = doc.splitTextToSize(u.name, colW - qtyW - 4);
          doc.text(nameLines[0], x + qtyW + 2, y);
          y += rowH;
          itemStripe += 1;
        }
        unitIdx += 1;
      }
    }
    setText(doc, '94a3b8');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Inventarliste · side ${pageIndex}`, margin, pageH - 4);
  }

  if (unitIdx < units.length) {
    console.warn(
      `Inventarliste overflow: ${units.length - unitIdx} rows not drawn (kept to 2 pages)`
    );
  }
}

function buildPdf() {
  // Page 1 is portrait (hall is taller than wide). Later pages set their own size/orientation.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a3' });
  drawFloorPlanPage(doc);
  drawSeatingDetailPage(doc); // A3 landscape combined
  drawSeatingDetailPagesA4(doc); // A4 print split (map + lists)
  drawCateringPages(doc);
  return doc;
}

/** Simple HTML print fallback (same content outline). */
function buildHtmlFallback() {
  const tableBlocks = tables
    .map((t) => {
      const name = t.name;
      const seats = byTable.get(name) || [];
      const rows = seats
        .map(
          (s) =>
            `<tr><td>${s.seat}</td><td>${s.guest}</td><td>${s.food}</td></tr>`
        )
        .join('');
      return `<section class="table-block"><h2>${name} <span style="color:#991b1b;font-size:0.85rem">(${specialCountForTable(name)} special)</span></h2><table><thead><tr><th>Seat</th><th>Guest</th><th>Food</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join('\n');

  const svgTablesPlain = tables
    .map(
      (t) =>
        `<g><circle cx="${t.x}" cy="${t.y}" r="0.72" fill="#fff7ed" stroke="#b45309" stroke-width="0.08"/><text x="${t.x}" y="${t.y + 0.12}" text-anchor="middle" font-size="0.34" font-weight="700" fill="#0f172a">${t.name}</text></g>`
    )
    .join('');

  const svgTablesSpecial = tables
    .map((t) => {
      const b = mealBreakdown(t.name);
      return `<g>
        <circle cx="${t.x}" cy="${t.y}" r="0.85" fill="#fff7ed" stroke="#b45309" stroke-width="0.08"/>
        <text x="${t.x}" y="${t.y - 0.35}" text-anchor="middle" font-size="0.28" font-weight="700" fill="#0f172a">${t.name}</text>
        <text x="${t.x}" y="${t.y - 0.05}" text-anchor="middle" font-size="0.2" fill="#57534e">${b.meat} meat</text>
        <text x="${t.x}" y="${t.y + 0.18}" text-anchor="middle" font-size="0.2" fill="#1d4ed8">${b.fish} fish</text>
        <text x="${t.x}" y="${t.y + 0.41}" text-anchor="middle" font-size="0.2" fill="#166534">${b.vegetarian} veg</text>
        <text x="${t.x}" y="${t.y + 0.64}" text-anchor="middle" font-size="0.2" fill="#991b1b">${b.specialDietary} diet</text>
      </g>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ella & Mark — vendor handout</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: "Segoe UI", system-ui, sans-serif; color:#0f172a; line-height:1.4; }
    h1 { font-size:1.4rem; margin:0 0 0.25rem; }
    h2 { font-size:1.1rem; margin:1.2rem 0 0.4rem; color:#b45309; }
    .muted { color:#64748b; font-size:0.9rem; }
    .plan { page-break-after: always; }
    svg { width:100%; max-width:720px; height:auto; background:#f5f0e8; }
    table { width:100%; border-collapse:collapse; font-size:0.88rem; margin-bottom:0.8rem; }
    th, td { border-bottom:1px solid #e7e5e4; padding:0.35rem 0.4rem; text-align:left; }
    th { color:#64748b; font-weight:600; font-size:0.75rem; }
    .table-block { page-break-inside: avoid; }
    @media print { .no-print { display:none; } }
  </style>
</head>
<body>
  <p class="no-print muted">Print → Save as PDF. Primary: vendor-handout.pdf · layout setup ${SETUP_ID}</p>
  <section class="plan">
    <h1>Ella &amp; Mark — Kostald floor plan</h1>
    <p class="muted">Full hall · kitchen at top · setup ${SETUP_ID}</p>
    <svg viewBox="0 -7.2 13.6 33.5" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="-7.03" width="13.6" height="7.03" fill="#fef3c7" stroke="#b45309" stroke-width="0.06"/>
      <text x="6.8" y="-3.6" text-anchor="middle" fill="#92400e" font-size="0.55" font-weight="700">KITCHEN / KØKKEN</text>
      <rect x="0.4" y="0.4" width="4.8" height="3.8" fill="#e7e5e4"/>
      <rect x="8.4" y="0.4" width="4.8" height="3.8" fill="#e7e5e4"/>
      <rect x="${danceX}" y="${danceY}" width="${danceW}" height="${danceH}" fill="#1c4966" fill-opacity="0.2" stroke="#1c4966" stroke-width="0.06"/>
      <text x="${danceX + 4}" y="${danceY + 4}" text-anchor="middle" fill="#1c4966" font-size="0.45" font-weight="700">DANCE FLOOR</text>
      <rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" fill="#92400e"/>
      <rect x="${W - BAR.staff}" y="${BAR.y}" width="${BAR.staff}" height="${BAR.h}" fill="#fde68a" fill-opacity="0.6"/>
      ${svgTablesPlain}
    </svg>
  </section>
  <section class="plan">
    <h1>Seating zone — special food</h1>
    <p class="muted">Kitchen ↑ · per table: meat / fish / vegetarian / special dietary</p>
    <svg viewBox="0 0 13.6 17" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.15" y="0.15" width="13.3" height="1.0" fill="#fef3c7" stroke="#b45309" stroke-width="0.04"/>
      <text x="6.8" y="0.8" text-anchor="middle" fill="#92400e" font-size="0.35" font-weight="700">↑ KITCHEN / KØKKEN this way</text>
      ${svgTablesSpecial}
    </svg>
  </section>
  <section>
    <h1>Catering — seats &amp; meals</h1>
    ${tableBlocks}
  </section>
</body>
</html>`;
}

const doc = buildPdf();
const pdfBytes = doc.output('arraybuffer');
const outPdf = Buffer.from(pdfBytes);
mkdirSync(resolve(root, 'tmp'), { recursive: true });
writeFileSync(resolve(root, 'tmp/vendor-handout.pdf'), outPdf);
writeFileSync(resolve(root, 'public/vendor-handout.pdf'), outPdf);
writeFileSync(resolve(root, 'tmp/vendor-handout.html'), buildHtmlFallback());
writeFileSync(resolve(root, 'public/vendor-handout.html'), buildHtmlFallback());

console.log('Wrote tmp/vendor-handout.pdf + public/vendor-handout.pdf');
console.log('HTML fallback: tmp/vendor-handout.html');
console.log('Layout setup:', SETUP_ID);
console.log('Tables on plan:', tables.map((t) => t.name).join(', '));
console.log(
  'Meal breakdown:',
  tables
    .map((t) => {
      const b = mealBreakdown(t.name);
      return `${t.name}=${b.meat}m/${b.fish}f/${b.vegetarian}v/${b.specialDietary}d`;
    })
    .join(', ')
);
