import { test, expect } from '@playwright/test';

test.describe('District page', () => {
  test('shows district name and candidate list', async ({ page }) => {
    await page.goto('obvod/3/');
    await expect(page.getByRole('heading', { name: /Cheb/ })).toBeVisible();
    // Should list candidates
    await expect(page.getByText(/kandidátů/)).toBeVisible();
  });

  test('shows vote percentage bars when results exist', async ({ page }) => {
    await page.goto('obvod/3/');
    // Round 1 percentages should be shown
    await expect(page.getByText(/%/).first()).toBeVisible();
  });

  test('candidate link navigates to candidate page', async ({ page }) => {
    await page.goto('obvod/3/');
    // Click first candidate
    const firstCandidate = page.getByRole('link').filter({ hasText: /#1/ }).first();
    await firstCandidate.click();
    await expect(page).toHaveURL(/\/kandidat\/3\/1\//);
  });

  test('back navigation link returns to home', async ({ page }) => {
    await page.goto('obvod/6/');
    await page.getByRole('link', { name: /← Přehled obvodů/ }).click();
    await expect(page).toHaveURL(/\/senat-2026-web\/?$/);
  });

  test('Praha districts are accessible', async ({ page }) => {
    for (const id of [21, 24, 27]) {
      await page.goto(`obvod/${id}/`);
      await expect(page.getByRole('heading', { name: /Praha/ })).toBeVisible();
    }
  });

  test('eastern districts render correctly', async ({ page }) => {
    await page.goto('obvod/72/');
    await expect(page.getByRole('heading', { name: /Ostrava/ })).toBeVisible();
  });
});
