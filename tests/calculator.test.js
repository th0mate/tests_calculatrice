const Calculator = require("../src/calculator");

describe("Calculator", () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe("add", () => {
    it.each`
      a     | b     | expected
      ${2}  | ${3}  | ${5}
      ${-5} | ${-3} | ${-8}
      ${-5} | ${3}  | ${-2}
      ${7}  | ${0}  | ${7}
    `("devrait retourner $a + $b = $expected", ({ a, b, expected }) => {
      expect(calculator.add(a, b)).toBe(expected);
    });

    it("devrait retourner environ 0.3 pour 0.1 + 0.2", () => {
      expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe("subtract", () => {
    it.each`
      a     | b     | expected
      ${10} | ${4}  | ${6}
      ${3}  | ${10} | ${-7}
      ${5}  | ${0}  | ${5}
      ${-5} | ${-3} | ${-2}
    `("devrait retourner $a - $b = $expected", ({ a, b, expected }) => {
      expect(calculator.subtract(a, b)).toBe(expected);
    });

    it("devrait retourner environ 0.2 pour 0.3 - 0.1", () => {
      expect(calculator.subtract(0.3, 0.1)).toBeCloseTo(0.2);
    });
  });

  describe("multiply", () => {
    it.each`
      a     | b      | expected
      ${6}  | ${7}   | ${42}
      ${0}  | ${999} | ${0}
      ${-3} | ${-4}  | ${12}
      ${3}  | ${-4}  | ${-12}
    `("devrait retourner $a * $b = $expected", ({ a, b, expected }) => {
      expect(calculator.multiply(a, b)).toBe(expected);
    });

    it("devrait retourner environ 0.02 pour 0.1 * 0.2", () => {
      expect(calculator.multiply(0.1, 0.2)).toBeCloseTo(0.02);
    });
  });

  describe("divide", () => {
    it.each`
      a      | b     | expected
      ${20}  | ${5}  | ${4}
      ${0}   | ${5}  | ${0}
      ${-10} | ${-2} | ${5}
      ${-7}  | ${2}  | ${-3.5}
    `("devrait retourner $a / $b = $expected", ({ a, b, expected }) => {
      expect(calculator.divide(a, b)).toBe(expected);
    });

    it("devrait retourner environ 3.333 pour 10 / 3", () => {
      expect(calculator.divide(10, 3)).toBeCloseTo(3.333);
    });

    it("devrait lever une erreur pour la division par zéro", () => {
      expect(() => calculator.divide(10, 0)).toThrow("Division par zéro impossible.");
    });
  });

  describe("Cas de coercion JS à documenter", () => {
    it("devrait retourner 2 pour add(null, 2)", () => {
      expect(calculator.add(null, 2)).toBe(2);
    });

    it("devrait retourner NaN pour subtract(undefined, 5)", () => {
      expect(calculator.subtract(undefined, 5)).toBeNaN();
    });

    it("devrait retourner NaN pour multiply('abc', 3)", () => {
      expect(calculator.multiply("abc", 3)).toBeNaN();
    });

    it("devrait retourner NaN pour divide(NaN, 5)", () => {
      expect(calculator.divide(NaN, 5)).toBeNaN();
    });
  });
});
