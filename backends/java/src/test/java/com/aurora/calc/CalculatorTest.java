package com.aurora.calc;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CalculatorTest {

    private final Calculator calc = new Calculator();

    @Test
    void add() {
        assertEquals(5, calc.add(2, 3), 1e-9);
        assertEquals(-8, calc.add(-5, -3), 1e-9);
        assertEquals(0, calc.add(0, 0), 1e-9);
    }

    @Test
    void subtract() {
        assertEquals(6, calc.subtract(10, 4), 1e-9);
        assertEquals(-2, calc.subtract(-5, -3), 1e-9);
    }

    @Test
    void multiply() {
        assertEquals(42, calc.multiply(6, 7), 1e-9);
        assertEquals(12, calc.multiply(-3, -4), 1e-9);
        assertEquals(0, calc.multiply(123, 0), 1e-9);
    }

    @Test
    void divide() {
        assertEquals(4, calc.divide(20, 5), 1e-9);
        assertEquals(5, calc.divide(-10, -2), 1e-9);
        assertEquals(3.3333, calc.divide(10, 3), 1e-4);
    }

    @Test
    void divideByZeroThrows() {
        ArithmeticException ex = assertThrows(ArithmeticException.class, () -> calc.divide(10, 0));
        assertEquals("Division par zéro impossible.", ex.getMessage());
    }
}
