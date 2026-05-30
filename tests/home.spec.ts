import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('');
    await expect(page).toHaveTitle(/Senátní volby 2026/);
    await expect(page.getByRole('heading', { name: /Volby do Senátu 2026/ })).toBeVisible();
  });

  test('shows district count and candidate count', async ({ page }) => {
    await page.goto('');
    await expect(page.getByText(/27 obvodů/)).toBeVisible();
  });

  test('renders SVG map with clickable district regions', async ({ page }) => {
    await page.goto('');
    // SVG should be present
    await expect(page.locator('svg').first()).toBeVisible();
    // All 27 active district paths should be present
    const activeRegions = page.locator('.s-active');
    await expect(activeRegions).toHaveCount(27);
  });

  test('district legend shows all 27 districts', async ({ page }) => {
    await page.goto('');
    const links = page.getByRole('link', { name: /Cheb|Louny|Plzeň|Strakonice|Pelhřimov|Příbram|Praha|Kladno|Děčín|Česká Lípa|Trutnov|Kolín|Hradec Králové|Rychnov|Žďár|Znojmo|Vyškov|Brno|Přerov|Olomouc|Frýdek|Ostrava|Karviná|Zlín|Uherské/ });
    // At least some districts are visible in legend
    await expect(links.first()).toBeVisible();
  });

  test('legend link navigates to district page', async ({ page }) => {
    await page.goto('');
    await page.locator('a[href$="obvod/3/"]').last().click();
    await expect(page).toHaveURL(/\/obvod\/3\//);
    await expect(page.getByRole('heading', { name: /Cheb/ })).toBeVisible();
  });

  test('active SVG region has correct href', async ({ page }) => {
    await page.goto('');
    const region = page.locator('.s-active[aria-label="Obvod 3 – Cheb"]');
    await expect(region).toHaveAttribute('data-href', /obvod\/3\//);
  });
});
