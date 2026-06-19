<?php

declare(strict_types=1);

namespace Aurora\Tests;

use Aurora\Calculator;
use PHPUnit\Framework\TestCase;

final class CalculatorTest extends TestCase
{
    private Calculator $calc;

    protected function setUp(): void
    {
        $this->calc = new Calculator();
    }

    public function testAdd(): void
    {
        $this->assertSame(5.0, $this->calc->add(2, 3));
        $this->assertSame(-8.0, $this->calc->add(-5, -3));
        $this->assertSame(0.0, $this->calc->add(0, 0));
    }

    public function testSubtract(): void
    {
        $this->assertSame(6.0, $this->calc->subtract(10, 4));
        $this->assertSame(-2.0, $this->calc->subtract(-5, -3));
    }

    public function testMultiply(): void
    {
        $this->assertSame(42.0, $this->calc->multiply(6, 7));
        $this->assertSame(12.0, $this->calc->multiply(-3, -4));
        $this->assertSame(0.0, $this->calc->multiply(123, 0));
    }

    public function testDivide(): void
    {
        $this->assertSame(4.0, $this->calc->divide(20, 5));
        $this->assertSame(5.0, $this->calc->divide(-10, -2));
        $this->assertEqualsWithDelta(3.3333, $this->calc->divide(10, 3), 0.0001);
    }

    public function testDivideByZeroThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Division par zéro impossible.');
        $this->calc->divide(10, 0);
    }
}
