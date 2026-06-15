module.exports = {
  testEnvironment: "node",
  // Les tests Playwright (./e2e) ne doivent pas être exécutés par Jest.
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js"],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
