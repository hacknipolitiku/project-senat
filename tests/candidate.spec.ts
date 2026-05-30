import { test, expect } from '@playwright/test';

test.describe('Candidate page', () => {
  test('shows candidate name and basic info', async ({ page }) => {
    await page.goto('kandidat/3/5/');
    // Candidate 5 in Cheb is Plevný Miroslav (winner)
    await expect(page.getByRole('heading', { name: /Plevný/ }).first()).toBeVisible();
    await expect(page.getByText(/Povolání/i)).toBeVisible();
    await expect(page.getByText(/Bydliště/i)).toBeVisible();
  });

  test('shows election results section', async ({ page }) => {
    await page.goto('kandidat/3/5/');
    await expect(page.getByText(/Výsledky voleb/i)).toBeVisible();
    await expect(page.getByText(/1\. kolo/)).toBeVisible();
    await expect(page.getByText(/2\. kolo/)).toBeVisible();
  });

  test('shows campaign section in markdown profile', async ({ page }) => {
    await page.goto('kandidat/3/1/');
    await expect(page.getByRole('heading', { name: /Zapojení do kampaně/i })).toBeVisible();
  });

  test('shows candidate Q&A section in markdown profile', async ({ page }) => {
    await page.goto('kandidat/3/1/');
    await expect(page.getByRole('heading', { name: /Motivace ke kandidatuře/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Kde vidíte republiku/i })).toBeVisible();
  });

  test('breadcrumb navigation back to district works', async ({ page }) => {
    await page.goto('kandidat/6/8/');
    await page.getByRole('link', { name: /Obvod 6/ }).click();
    await expect(page).toHaveURL(/\/obvod\/6\//);
  });

  test('winner badge shown for round-2 winner', async ({ page }) => {
    // Candidate 5 in district 3 (Plevný) won round 2
    await page.goto('kandidat/3/5/');
    await expect(page.getByText(/Zvolený senátor/i)).toBeVisible();
  });

  test('non-winner candidate has no winner badge', async ({ page }) => {
    // Candidate 1 in district 3 did not make round 2
    await page.goto('kandidat/3/1/');
    await expect(page.getByText(/Zvolený senátor/i)).not.toBeVisible();
  });
});
