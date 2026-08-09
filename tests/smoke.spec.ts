import { test, expect } from "@playwright/test";

test("home shell renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Generate your next sound/i })).toBeVisible();
  await expect(page.getByText("Pulseforge").first()).toBeVisible();
});

test("auth login page renders", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByText(/Sign in to sync projects/i)).toBeVisible();
});

test("create → generate → results (mock provider)", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/create");
  await page.getByPlaceholder(/dreamy melodic techno/i).fill(
    "dark warehouse techno with rolling bass",
  );
  await page.getByRole("button", { name: /Generate Track/i }).click();
  await expect(page).toHaveURL(/\/generating\//);
  await expect(page.getByText(/Forging your track/i)).toBeVisible();
  await page.waitForURL(/\/results\//, { timeout: 45_000 });
  await expect(page.getByText(/Take 1/i).first()).toBeVisible();
});

test("library loads", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByText("Midnight Circuit v3")).toBeVisible();
});
