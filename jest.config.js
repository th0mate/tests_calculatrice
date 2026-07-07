module.exports = {
  testEnvironment: "node",
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
