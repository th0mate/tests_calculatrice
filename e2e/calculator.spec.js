const { test, expect } = require("./fixtures");

const value = (page) => page.locator("#value");
const expr = (page) => page.locator("#expr");
const display = (page) => page.locator("#display");
const status = (page) => page.locator("#status");
const digit = (page, d) => page.locator(`.key[data-digit="${d}"]`);
const op = (page, o) => page.locator(`.key[data-op="${o}"]`);
const action = (page, a) => page.locator(`.key[data-action="${a}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Chargement & état initial", () => {
  test("affiche le titre et l'afficheur à 0", async ({ page }) => {
    await expect(page).toHaveTitle(/Aurora/);
    await expect(value(page)).toHaveText("0");
    await expect(status(page)).toContainText("API prête");
    await expect(status(page)).toHaveClass(/status--idle/);
  });

  test("le message d'historique vide est visible", async ({ page }) => {
    await expect(page.locator("#history-empty")).toBeVisible();
    await expect(page.locator(".history__item")).toHaveCount(0);
  });
});

test.describe("Saisie des nombres", () => {
  test("concatène les chiffres cliqués", async ({ page }) => {
    await digit(page, 7).click();
    await digit(page, 8).click();
    await digit(page, 9).click();
    await expect(value(page)).toHaveText("789");
  });

  test("remplace le zéro initial", async ({ page }) => {
    await digit(page, 0).click();
    await digit(page, 5).click();
    await expect(value(page)).toHaveText("5");
  });

  test("gère la virgule décimale et empêche les doublons", async ({ page }) => {
    await digit(page, 3).click();
    await action(page, "decimal").click();
    await digit(page, 1).click();
    await action(page, "decimal").click(); // ignorée
    await digit(page, 4).click();
    await expect(value(page)).toHaveText("3,14");
  });

  test("inverse le signe avec ±", async ({ page }) => {
    await digit(page, 5).click();
    await action(page, "negate").click();
    await expect(value(page)).toHaveText("-5");
    await action(page, "negate").click();
    await expect(value(page)).toHaveText("5");
  });

  test("efface le dernier chiffre avec ⌫", async ({ page }) => {
    await digit(page, 1).click();
    await digit(page, 2).click();
    await digit(page, 3).click();
    await action(page, "backspace").click();
    await expect(value(page)).toHaveText("12");
  });

  test("C remet tout à zéro", async ({ page }) => {
    await digit(page, 9).click();
    await op(page, "add").click();
    await digit(page, 9).click();
    await action(page, "clear").click();
    await expect(value(page)).toHaveText("0");
    await expect(expr(page)).toHaveText("");
  });
});

test.describe("Opérations via le backend", () => {
  test("addition : 2 + 3 = 5", async ({ page }) => {
    await digit(page, 2).click();
    await op(page, "add").click();
    await digit(page, 3).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("5");
    await expect(display(page)).toHaveClass(/display--result/);
  });

  test("multiplication : 6 × 7 = 42", async ({ page }) => {
    await digit(page, 6).click();
    await op(page, "multiply").click();
    await digit(page, 7).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("42");
  });

  test("soustraction : 10 − 4 = 6", async ({ page }) => {
    await digit(page, 1).click();
    await digit(page, 0).click();
    await op(page, "subtract").click();
    await digit(page, 4).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("6");
  });

  test("division décimale : 10 ÷ 3 (format fr-FR)", async ({ page }) => {
    await digit(page, 1).click();
    await digit(page, 0).click();
    await op(page, "divide").click();
    await digit(page, 3).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("3,3333333333");
  });

  test("l'opérateur sélectionné est mis en évidence", async ({ page }) => {
    await digit(page, 8).click();
    await op(page, "add").click();
    await expect(op(page, "add")).toHaveClass(/is-active/);
    await expect(expr(page)).toContainText("8 +");
  });

  test("enchaînement : 2 + 3 puis × 4 = 20", async ({ page }) => {
    await digit(page, 2).click();
    await op(page, "add").click();
    await digit(page, 3).click();
    await op(page, "multiply").click();
    await expect(value(page)).toHaveText("5");
    await digit(page, 4).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("20");
  });

  test("formate les grands nombres avec séparateur de milliers", async ({ page }) => {
    for (const d of "9999") await digit(page, d).click();
    await op(page, "multiply").click();
    for (const d of "9999") await digit(page, d).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText(/99.980.001/);
  });
});

test.describe("Gestion des erreurs", () => {
  test("division par zéro affiche l'erreur du backend", async ({ page }) => {
    await digit(page, 5).click();
    await op(page, "divide").click();
    await digit(page, 0).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("Division par zéro impossible.");
    await expect(display(page)).toHaveClass(/display--error/);
    await expect(status(page)).toContainText("Erreur API");
    await expect(status(page)).toHaveClass(/status--error/);
    await expect(page.locator(".history__item")).toHaveCount(0);
  });

  test("affiche l'état « Calcul… » pendant un appel lent", async ({ page }) => {
    await page.route("**/calculate**", async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });
    await digit(page, 1).click();
    await op(page, "add").click();
    await digit(page, 1).click();
    await action(page, "equals").click();
    await expect(status(page)).toContainText("Calcul…");
    await expect(status(page)).toHaveClass(/status--busy/);
    await expect(value(page)).toHaveText("2");
    await expect(status(page)).toContainText("API prête");
  });

  test("gère une erreur réseau / serveur 500", async ({ page }) => {
    await page.route("**/calculate**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Boom serveur" }),
      })
    );
    await digit(page, 1).click();
    await op(page, "add").click();
    await digit(page, 1).click();
    await action(page, "equals").click();
    await expect(value(page)).toHaveText("Boom serveur");
    await expect(display(page)).toHaveClass(/display--error/);
  });
});

test.describe("Support du clavier physique", () => {
  test("calcule via le clavier : 12 + 8 puis Entrée", async ({ page }) => {
    await page.keyboard.type("12+8");
    await page.keyboard.press("Enter");
    await expect(value(page)).toHaveText("20");
  });

  test("Échap réinitialise et Backspace efface", async ({ page }) => {
    await page.keyboard.type("45");
    await page.keyboard.press("Backspace");
    await expect(value(page)).toHaveText("4");
    await page.keyboard.press("Escape");
    await expect(value(page)).toHaveText("0");
  });
});
