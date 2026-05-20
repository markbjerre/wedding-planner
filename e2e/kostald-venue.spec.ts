import { test, expect } from '@playwright/test';
import {
  KOSTALD_KITCHEN,
  KOSTALD_MEASURED,
  KOSTALD_PILLAR_MODULE,
  kostaldHallCanvasLengthM,
} from '../src/data/kostald-venue';

const STORAGE_KEY = 'wedding-planner-layout:self';

test.describe('Kostald default layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wedding-planner/');
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      localStorage.removeItem('wedding-planner-layout');
    }, STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('persists Kostald outer dimensions in localStorage', async ({ page }) => {
    await page.waitForFunction(
      (key) => localStorage.getItem(key) !== null,
      STORAGE_KEY,
      { timeout: 10_000 }
    );

    const layout = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, STORAGE_KEY);

    const canvasH = KOSTALD_KITCHEN.depthM + kostaldHallCanvasLengthM();
    expect(layout).not.toBeNull();
    expect(layout.venueWidthM).toBe(KOSTALD_MEASURED.outerWidthM);
    expect(layout.venueHeightM).toBeCloseTo(canvasH, 1);
    expect(layout.venueName).toMatch(/Kostald/i);
    expect(layout.name).toMatch(/Kostald/i);
  });

  test('has 15 pillars, kitchen, depots, and hall zone', async ({ page }) => {
    await page.waitForFunction(
      (key) => localStorage.getItem(key) !== null,
      STORAGE_KEY,
      { timeout: 10_000 }
    );

    const summary = await page.evaluate((key) => {
      const layout = JSON.parse(localStorage.getItem(key)!);
      return {
        pillars: layout.shapes.filter((s: { kind: string }) => s.kind === 'pillar').length,
        kitchen: layout.shapes.some((s: { id: string }) => s.id === 'zone-kitchen'),
        depots: layout.shapes.filter((s: { id: string }) => s.id.startsWith('zone-depot')).length,
        hall: layout.shapes.some((s: { id: string }) => s.id === 'zone-hall'),
        rooms: layout.rooms.length,
        dance: layout.shapes.some((s: { kind: string }) => s.kind === 'dance-floor'),
      };
    }, STORAGE_KEY);

    expect(summary.pillars).toBe(
      KOSTALD_PILLAR_MODULE.rowCount * KOSTALD_PILLAR_MODULE.colCount
    );
    expect(summary.kitchen).toBe(true);
    expect(summary.depots).toBe(2);
    expect(summary.hall).toBe(true);
    expect(summary.rooms).toBeGreaterThanOrEqual(26);
    expect(summary.dance).toBe(true);
  });

  test('layout panel shows Kostald canvas size', async ({ page }) => {
    const canvasH = KOSTALD_KITCHEN.depthM + kostaldHallCanvasLengthM();
    await page.getByRole('button', { name: 'Layout' }).click();
    await expect(page.getByText('Space Dimensions')).toBeVisible();
    await expect(
      page.getByText(
        `Canvas: ${KOSTALD_MEASURED.outerWidthM * 40} × ${canvasH * 40} px`
      )
    ).toBeVisible();
  });
});
