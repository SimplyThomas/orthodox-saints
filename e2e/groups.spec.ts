import { test, expect } from "@playwright/test";

test("a group landing page renders its members and type", async ({ page }) => {
  const resp = await page.goto("./group/three-hierarchs/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("Three Holy Hierarchs");
  await expect(page.locator(".grp-badge")).toContainText("Feast Companions");
  // The three hierarchs each link to their saint page.
  for (const id of ["OS-0021", "OS-0022", "OS-0023"]) {
    await expect(page.locator(`.grp-grid a[href*="/saint/${id}"]`)).toHaveCount(
      1,
    );
  }
});

test("a member saint page links back to its group", async ({ page }) => {
  await page.goto("./saint/OS-0021/"); // Basil the Great
  const link = page.locator('a[href*="/group/three-hierarchs"]');
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForURL(/\/group\/three-hierarchs\/?$/);
  await expect(page.locator("h1")).toContainText("Three Holy Hierarchs");
});

test("the finder Group facet filters the results", async ({ page }) => {
  await page.goto("./search/");
  const panel = page.locator('details[data-key="groupNames"]');
  await expect(panel.locator("summary")).toContainText("Group");
  await panel.locator("summary").click();
  await panel
    .locator('label:has(input[value="The Three Holy Hierarchs"])')
    .click();
  await expect(
    panel.locator(
      'input[data-key="groupNames"][value="The Three Holy Hierarchs"]',
    ),
  ).toBeChecked();
  await expect(page.locator("#count")).toContainText("filter");
});
