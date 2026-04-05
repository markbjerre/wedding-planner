import { test, expect } from '@playwright/test';

test.describe('wedding-planner', () => {
  test('loads SPA at base path', async ({ page }) => {
    await page.goto('/wedding-planner/');
    await expect(page).toHaveTitle(/wedding-planner/i);
    await expect(page.getByText('Wedding').first()).toBeVisible();
  });

  test('health JSON endpoint', async ({ request }) => {
    const res = await request.get('/wedding-planner/health.json');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toMatch(/json/);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('wedding-planner');
  });

  test('editor view shows canvas toolbar', async ({ page }) => {
    await page.goto('/wedding-planner/');
    await expect(page.getByRole('button', { name: 'Editor' })).toBeVisible();
    await expect(page.getByText('Layer:', { exact: false }).first()).toBeVisible();
  });
});
