const { test, expect } = require("./fixtures");

const digit = (page, d) => page.locator(`.key[data-digit="${d}"]`);
const op = (page, o) => page.locator(`.key[data-op="${o}"]`);
const action = (page, a) => page.locator(`.key[data-action="${a}"]`);
const items = (page) => page.locator(".history__item");

async function compute(page, a, operation, b) {
  await action(page, "clear").click();
  for (const d of String(a)) await digit(page, d).click();
  await op(page, operation).click();
  for (const d of String(b)) await digit(page, d).click();
  await action(page, "equals").click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("ajoute une entrée d'historique après un calcul", async ({ page }) => {
  await compute(page, 6, "multiply", 7);
  await expect(items(page)).toHaveCount(1);
  const first = items(page).first();
  await expect(first.locator(".history__expr")).toHaveText("6 × 7 =");
  await expect(first.locator(".history__res")).toHaveText("42");
});

test("empile les calculs les plus récents en haut", async ({ page }) => {
  await compute(page, 2, "add", 3);
  await compute(page, 8, "subtract", 1);
  await expect(items(page)).toHaveCount(2);
  await expect(items(page).first().locator(".history__expr")).toHaveText("8 − 1 =");
  await expect(items(page).last().locator(".history__expr")).toHaveText("2 + 3 =");
});

test("cliquer sur une entrée réinjecte son résultat dans l'afficheur", async ({ page }) => {
  await compute(page, 9, "add", 6); // = 15
  await action(page, "clear").click();
  await expect(page.locator("#value")).toHaveText("0");
  await items(page).first().click();
  await expect(page.locator("#value")).toHaveText("15");
});

test("le bouton Vider supprime tout l'historique", async ({ page }) => {
  await compute(page, 2, "add", 2);
  await compute(page, 3, "add", 3);
  await expect(items(page)).toHaveCount(2);
  await page.locator("#clear-history").click();
  await expect(items(page)).toHaveCount(0);
  await expect(page.locator("#history-empty")).toBeVisible();
});

test("le panneau d'historique ne dépasse pas la calculatrice et reste scrollable", async ({
  page,
}) => {
  for (let i = 0; i < 15; i++) await compute(page, i + 1, "add", 1);

  const metrics = await page.evaluate(() => {
    const cal = document.querySelector(".calculator").getBoundingClientRect();
    const his = document.querySelector(".history").getBoundingClientRect();
    const list = document.querySelector(".history__list");
    return {
      calcH: Math.round(cal.height),
      histH: Math.round(his.height),
      pageOverflows:
        document.documentElement.scrollHeight > window.innerHeight + 1,
      listScrollable: list.scrollHeight > list.clientHeight + 1,
    };
  });

  // Hauteur calée sur la calculatrice (tolérance 2px) et pas de débordement de page.
  expect(Math.abs(metrics.calcH - metrics.histH)).toBeLessThanOrEqual(2);
  expect(metrics.pageOverflows).toBe(false);
  expect(metrics.listScrollable).toBe(true);
});
