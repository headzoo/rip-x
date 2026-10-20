import { test, expect } from "@playwright/test";

test("homepage, opt-out, accessible dialog, permanent link, and focus restoration", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("checkbox")).toBeChecked();
  const stones = page.getByRole("link", { name: /Read the fictional memorial/ });
  await expect(stones).toHaveCount(12);
  await page.screenshot({ path: "test-results/graveyard-desktop.png", fullPage: true });
  const first = stones.first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Last Words", exact: true })).toBeVisible();
  const headings = await page.getByRole("dialog").locator("article h2").allTextContents();
  expect(headings).toEqual(["Last Words", "A Life Spent Rearranging the Afterlife", "The Municipal Department of Unfinished Business"]);
  await expect(page.getByRole("link", { name: /Open permanent memorial/ })).toBeVisible();
  await page.screenshot({ path: "test-results/memorial-dialog.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(first).toBeFocused();
  await expect(page.getByLabel("X username", { exact: true })).toBeVisible();
});

test("dedicated graveyard search, pagination, and direct memorial", async ({ page }) => {
  await page.goto("/graveyard");
  const stones = page.getByRole("link", { name: /Read the fictional memorial/ });
  await expect(stones).toHaveCount(24);
  await page.getByRole("button", { name: "Older souls" }).click();
  await expect(stones).toHaveCount(8);
  await page.getByLabel("Find a name or X username").fill("fixture_0");
  await page.getByRole("button", { name: "Search graves" }).click();
  await expect(stones).toHaveCount(1);
  const href = await stones.first().getAttribute("href");
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: "Last Words", exact: true })).toBeVisible();
  await expect(page.getByText(/AI-generated fiction/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Last Words", exact: true })).toBeVisible();
});

test("public API excludes hidden and unfinished rows, validates IDs, and limits pages", async ({ request }) => {
  const res = await request.get("/api/graveyard");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toBe("no-store");
  const result = await res.json();
  expect(result.graves).toHaveLength(24);
  expect(result.graves[0]).not.toHaveProperty("xUserId");
  expect(result.graves[0]).not.toHaveProperty("claimToken");
  for (const id of ["bad-id", "22222222-2222-4222-8222-000000000032", "22222222-2222-4222-8222-000000000033"]) {
    expect((await request.get(`/api/graveyard/${id}`)).status()).toBe(404);
  }
  expect((await (await request.get("/api/graveyard?q=fixture_32")).json()).graves).toHaveLength(0);
});

test("mobile, reduced motion, empty state, and recoverable listing failure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Read the fictional memorial/ })).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('[class*="fog"]').first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.screenshot({ path: "test-results/graveyard-mobile.png", fullPage: true });
  await page.goto("/graveyard");
  await page.getByLabel("Find a name or X username").fill("no_such_soul");
  await page.getByRole("button", { name: "Search graves" }).click();
  await expect(page.getByText("No souls by that name.")).toBeVisible();
  await page.route("**/api/graveyard?*", route => route.fulfill({
    status: 503, contentType: "application/json",
    body: JSON.stringify({ error: "The graveyard gates are temporarily closed. Please try again." }),
  }));
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "temporarily closed" })).toBeVisible();
  await page.unroute("**/api/graveyard?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: /Read the fictional memorial/ })).toHaveCount(24);
});
