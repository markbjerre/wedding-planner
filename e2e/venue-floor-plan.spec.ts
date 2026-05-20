import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  KOSTALD_MEASURED,
  KOSTALD_PILLAR_MODULE,
  kostaldDividerYM,
  kostaldHallCanvasLengthM,
  kostaldPillarCentresM,
} from '../src/data/kostald-venue';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAN_FILE = path.join(__dirname, '../tmp/venue-floor-plan.html');
const PLAN_URL = process.env.PW_PLAN_HTTP
  ? 'http://127.0.0.1:5173/wedding-planner/tmp/venue-floor-plan.html'
  : pathToFileURL(PLAN_FILE).href;

const PILLAR_HALF = KOSTALD_PILLAR_MODULE.pillarSizeM / 2;

test.describe('venue-floor-plan.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PLAN_URL);
  });

  test('loads with title and main heading', async ({ page }) => {
    await expect(page).toHaveTitle(/Kostald — kitchen, depots & hall/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Kostald — kitchen, depots & hall'
    );
  });

  test('renders hall floor through divider at 28.2 m', async ({ page }) => {
    const svg = page.locator('svg[aria-label*="24 m clear hall"]');
    await expect(svg).toBeVisible();

    const hall = svg.locator('rect.hall-floor');
    await expect(hall).toHaveAttribute('width', String(KOSTALD_MEASURED.outerWidthM));
    await expect(hall).toHaveAttribute('height', String(kostaldHallCanvasLengthM()));
  });

  test('shows kitchen and depot rooms', async ({ page }) => {
    const svg = page.locator('svg');
    await expect(svg.getByText('KØKKEN')).toBeVisible();
    await expect(svg.getByText('DEPOT', { exact: true })).toHaveCount(2);
    await expect(svg.locator('rect.kitchen')).toHaveAttribute('height', '7.03');
    await expect(svg.locator('rect.depot')).toHaveCount(2);
  });

  test('shows 15 pillars matching venue constants', async ({ page }) => {
    const pillars = page.locator('svg rect[width="0.36"][height="0.36"]');
    await expect(pillars).toHaveCount(
      KOSTALD_PILLAR_MODULE.rowCount * KOSTALD_PILLAR_MODULE.colCount
    );

    for (const { x, y } of kostaldPillarCentresM()) {
      const cx = (x - PILLAR_HALF).toFixed(2);
      const cy = (y - PILLAR_HALF).toFixed(2);
      await expect(page.locator(`svg rect[x="${cx}"][y="${cy}"]`)).toHaveCount(1);
    }
  });

  test('shows dance floor and 24 m clear dimension', async ({ page }) => {
    await expect(page.locator('svg').getByText('FORSAMLINGSRUM', { exact: true })).toBeVisible();
    await expect(page.locator('svg').getByText('Dance floor', { exact: true })).toBeVisible();
    await expect(page.locator('svg').getByText('8 × 8 m')).toBeVisible();
    await expect(page.locator('svg').getByText('13.6 m')).toBeVisible();
    await expect(page.locator('svg').getByText('24 m clear')).toBeVisible();
  });

  test('sidebar lists 5×3 pillar grid', async ({ page }) => {
    const aside = page.locator('aside');
    await expect(aside.getByText(/Clear hall:/)).toBeVisible();
    await expect(aside.getByText('2.8 + 4 + 4 + 2.8 m')).toBeVisible();
    await expect(aside.getByText('5 rows × 3 cols = 15')).toBeVisible();
  });

  test('divider line at y=28.2 m', async ({ page }) => {
    const divider = page.locator('svg rect.divider-zone');
    await expect(divider).toHaveCount(1);
    await expect(divider).toHaveAttribute('y', String(kostaldDividerYM()));
  });

  test('SVG has non-zero rendered size', async ({ page }) => {
    const box = await page.locator('svg').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});
