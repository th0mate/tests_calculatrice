const { defineConfig, devices } = require("@playwright/test");

const PORT = process.env.WEB_PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * Tests end-to-end du frontend (dossier ./e2e).
 * Playwright démarre lui-même le serveur web (frontend + API délégué)
 * via `npm start`, puis exécute les scénarios dans Chromium.
 */
module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    reducedMotion: "reduce",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm start",
    url: baseURL,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: { WEB_PORT: String(PORT) },
  },
});
