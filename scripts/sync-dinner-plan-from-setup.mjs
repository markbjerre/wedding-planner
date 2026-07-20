/**
 * Patch src/data/kostald-dinner-plan.json table centres from
 * tmp/kostald-setup-placements.json.
 *
 * Usage:
 *   node scripts/sync-dinner-plan-from-setup.mjs          # uses vendor-handout-config.json
 *   node scripts/sync-dinner-plan-from-setup.mjs I
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const config = JSON.parse(
  readFileSync(resolve(root, 'src/data/vendor-handout-config.json'), 'utf8')
);
const setupId = (process.argv[2] || config.setupId || 'I').toUpperCase();
const SCALE = 40;
const HALL_TOP_M = 7.03;
const TABLE_DIAM_M = 1.36; // ~2 * TABLE_R from blueprint

const placements = JSON.parse(
  readFileSync(resolve(root, config.placementsFile || 'tmp/kostald-setup-placements.json'), 'utf8')
);
const tables = placements.setups[setupId];
if (!tables?.length) throw new Error(`No setup ${setupId} in placements`);

const planPath = resolve(root, 'src/data/kostald-dinner-plan.json');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const byName = new Map(tables.map((t) => [t.name, t]));

// Round-table x/y are centres (Konva offsetX/Y = width/2).
let patched = 0;
const shapes = plan.tables ?? plan.shapes ?? [];
for (const shape of shapes) {
  if (shape.kind !== 'round-table') continue;
  const p = byName.get(shape.label);
  if (!p) continue;
  const diamPx = TABLE_DIAM_M * SCALE;
  shape.x = p.x * SCALE;
  shape.y = (HALL_TOP_M + p.y) * SCALE;
  shape.width = diamPx;
  shape.height = diamPx;
  patched++;
}

plan.version = (plan.version ?? 0) + 1;
plan.updatedAt = new Date().toISOString();
plan.setupSource = `blueprint-${setupId}`;

writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
console.log(`Patched ${patched} tables from setup ${setupId} → dinner plan v${plan.version}`);
