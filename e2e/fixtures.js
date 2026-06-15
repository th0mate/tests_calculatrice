const base = require("@playwright/test");

/**
 * Fixture partagée : coupe les requêtes vers les polices externes
 * (Google Fonts). Elles sont purement cosmétiques (fallback système assuré
 * par le CSS) et, si le réseau est lent/bloqué en CI, elles retardent
 * l'évènement `load` et rendent les tests flaky. On les abandonne donc
 * pour des tests hermétiques, rapides et déterministes.
 */
const test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.abort()
    );
    await use(page);
  },
});

module.exports = { test, expect: base.expect };
