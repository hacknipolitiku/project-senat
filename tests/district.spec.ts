import { test, expect } from "@playwright/test";

test.describe("District page", () => {
  test("shows district name and candidate list", async ({ page }) => {
    await page.goto("obvody/cheb/");
    await expect(page.getByRole("heading", { name: /Cheb/ })).toBeVisible();
    // Should list candidates
    await expect(page.getByText(/kandidátů/)).toBeVisible();
  });

  test("candidate link navigates to candidate page", async ({ page }) => {
    await page.goto("obvody/cheb/");
    // Click first candidate
    const firstCandidate = page.getByRole("link").filter({ hasText: /#1/ }).first();
    await firstCandidate.click();
    await expect(page).toHaveURL(/\/kandidati\/sedlacek-jiri-3-1\//);
  });

  test("back navigation link returns to home", async ({ page }) => {
    await page.goto("obvody/louny/");
    await page.getByRole("link", { name: /← Přehled obvodů/ }).click();
    await expect(page).toHaveURL(/\/project-senat\/?$/);
  });

  test("Praha districts are accessible", async ({ page }) => {
    for (const slug of ["praha-5", "praha-9", "praha-1"]) {
      await page.goto(`obvody/${slug}/`);
      await expect(page.getByRole("heading", { name: /Praha/ })).toBeVisible();
    }
  });

  test("eastern districts render correctly", async ({ page }) => {
    await page.goto("obvody/ostrava-mesto/");
    await expect(page.getByRole("heading", { name: /Ostrava/ })).toBeVisible();
  });
});
