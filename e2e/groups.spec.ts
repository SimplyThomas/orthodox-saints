import { test, expect } from "@playwright/test";

// Groups are now saint-profiles (profile_type:"group") served at /saint/<id>;
// three-hierarchs is OS-2933. The standalone /group/<slug> pages were retired.

test("a group saint-profile renders its members and type", async ({ page }) => {
  const resp = await page.goto("./saint/OS-2933/");
  expect(resp?.status()).toBe(200);
  await expect(page.locator(".gsp-head h1")).toContainText(
    "Three Holy Hierarchs",
  );
  await expect(page.locator(".gsp-badge")).toContainText("Feast Companions");
  await expect(page.locator(".gsp-sum")).toContainText("Members of this Group");
  // The three hierarchs each link to their individual saint page.
  for (const id of ["OS-0021", "OS-0022", "OS-0023"]) {
    await expect(page.locator(`.gsp-grid a[href*="/saint/${id}"]`)).toHaveCount(
      1,
    );
  }
});

test("a member saint page links back to its group profile", async ({
  page,
}) => {
  await page.goto("./saint/OS-0021/"); // Basil the Great
  // "Member of" is a collapsible, closed by default — open it.
  await page.locator("details.sv-comm summary").click();
  const link = page.locator('a[href*="/saint/OS-2933"]');
  await expect(link.first()).toBeVisible();
  await link.first().click();
  await page.waitForURL(/\/saint\/OS-2933\/?$/);
  await expect(page.locator(".gsp-head h1")).toContainText(
    "Three Holy Hierarchs",
  );
});

test("the old /group/<slug> URL redirects to the group saint-profile", async ({
  page,
}) => {
  await page.goto("./group/three-hierarchs/");
  await page.waitForURL(/\/saint\/OS-2933\/?$/);
  await expect(page.locator(".gsp-head h1")).toContainText(
    "Three Holy Hierarchs",
  );
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
