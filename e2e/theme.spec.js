const { test, expect } = require("./fixtures");

const html = (page) => page.locator("html");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Bascule de thème", () => {
  test("part en thème sombre par défaut", async ({ page }) => {
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });

  test("bascule en clair puis en sombre", async ({ page }) => {
    await page.locator("#theme").click();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await page.locator("#theme").click();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });

  test("persiste le choix de thème après rechargement", async ({ page }) => {
    await page.locator("#theme").click();
    await expect(html(page)).toHaveAttribute("data-theme", "light");

    const stored = await page.evaluate(() =>
      localStorage.getItem("aurora-theme")
    );
    expect(stored).toBe("light");

    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
  });
});

test.describe("Responsive", () => {
  test("affiche calculatrice et historique sur desktop (2 colonnes)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator(".calculator")).toBeVisible();
    await expect(page.locator(".history")).toBeVisible();

    const columns = await page.evaluate(
      () => getComputedStyle(document.querySelector(".app")).gridTemplateColumns
    );
    expect(columns.trim().split(/\s+/).length).toBe(2);
  });

  test("reste utilisable sur mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator(".calculator")).toBeVisible();
    await expect(page.locator(".history")).toBeVisible();

    const columns = await page.evaluate(
      () => getComputedStyle(document.querySelector(".app")).gridTemplateColumns
    );
    expect(columns.trim().split(/\s+/).length).toBe(1);

    await page.locator('.key[data-digit="7"]').click();
    await expect(page.locator("#value")).toHaveText("7");
  });
});
