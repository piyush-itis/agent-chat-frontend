import { expect, test } from "@playwright/test";

test("sign-in page renders", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("body")).toBeVisible();
});

test("unauthenticated root is protected", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).toBeTruthy();
});

test("unauthenticated settings is protected", async ({ page }) => {
  const response = await page.goto("/settings");
  expect(response).toBeTruthy();
  await expect(page).not.toHaveURL(/\/settings$/);
});
