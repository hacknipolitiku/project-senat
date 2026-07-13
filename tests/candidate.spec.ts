import { test, expect } from "@playwright/test";

test.describe("Candidate page", () => {
  test("shows candidate name and basic info", async ({ page }) => {
    await page.goto("kandidati/plevny-miroslav-3-5/");
    // Candidate 5 in Cheb is Plevný Miroslav (winner)
    await expect(page.getByRole("heading", { name: /Plevný/ }).first()).toBeVisible();
    await expect(page.getByText(/Povolání/i)).toBeVisible();
    await expect(page.getByText(/Bydliště/i)).toBeVisible();
  });

  test("breadcrumb navigation back to district works", async ({ page }) => {
    await page.goto("kandidati/tresl-ivo-6-8/");
    await page
      .getByRole("link", { name: /← Přehled kandidátů/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/obvody\/louny\//);
  });
});
