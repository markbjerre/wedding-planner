/**
 * One-off: apply accommodation seed to the running dev app via localStorage.
 * Usage: npx tsx scripts/apply-accommodation-browser.ts
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAccommodationSeed } from '../src/lib/applyAccommodation.ts';
import { parseLayoutFromJsonText } from '../src/lib/layoutMerge.ts';
import { SAMPLE_LAYOUT } from '../src/data/sample-layout.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5173/wedding-planner/';
const STORAGE_KEY = 'wedding-planner-layout:self';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(BASE);
  await page.waitForLoadState('networkidle');

  const existingRaw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const baseLayout = existingRaw
    ? parseLayoutFromJsonText(existingRaw)
    : SAMPLE_LAYOUT;

  const merged = applyAccommodationSeed(baseLayout);
  const json = JSON.stringify(merged);

  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, data);
    },
    { key: STORAGE_KEY, data: json }
  );

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Rooms' }).click();

  const roomCount = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const layout = JSON.parse(raw) as { rooms: unknown[] };
    return layout.rooms.length;
  }, STORAGE_KEY);

  const outPath = resolve(__dirname, '../tmp/accommodation-layout.json');
  writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`Applied accommodation plan: ${roomCount} rooms`);
  console.log(`Saved layout snapshot: ${outPath}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
