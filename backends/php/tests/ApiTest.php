<?php

declare(strict_types=1);

namespace Aurora\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests d'intégration : démarre le vrai serveur web PHP (php -S) puis interroge
 * l'endpoint /calculate par HTTP. Équivalent PHP de tests/api.test.js.
 */
final class ApiTest extends TestCase
{
    /** @var resource|null */
    private static $process;
    private static string $base;
    private static int $port;

    public static function setUpBeforeClass(): void
    {
        self::$port = random_int(8100, 8999);
        self::$base = 'http://127.0.0.1:' . self::$port;

        $root = dirname(__DIR__);
        $cmd = sprintf(
            'php -S 127.0.0.1:%d -t %s %s',
            self::$port,
            escapeshellarg($root . '/public'),
            escapeshellarg($root . '/public/index.php')
        );

        $descriptors = [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']];
        self::$process = proc_open($cmd, $descriptors, $pipes, $root);

        for ($i = 0; $i < 50; $i++) {
            $probe = @fopen(self::$base . '/calculate?operation=add&a=1&b=1', 'r');
            if ($probe !== false) {
                fclose($probe);
                return;
            }
            usleep(100_000);
        }

        self::fail('Le serveur PHP de test ne répond pas.');
    }

    public static function tearDownAfterClass(): void
    {
        if (is_resource(self::$process)) {
            $status = proc_get_status(self::$process);
            if ($status['running']) {
                if (stripos(PHP_OS, 'WIN') === 0) {
                    exec('taskkill /F /T /PID ' . $status['pid'] . ' 2>NUL');
                } else {
                    exec('kill ' . $status['pid'] . ' 2>/dev/null');
                }
            }
            proc_close(self::$process);
        }
    }

    /**
     * @return array{status:int,headers:array<string,string>,body:?array<string,mixed>}
     */
    private function request(string $path, string $method = 'GET'): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'ignore_errors' => true,
                'timeout' => 5,
            ],
        ]);

        $raw = @file_get_contents(self::$base . $path, false, $context);
        $status = 0;
        $headers = [];
        foreach ($http_response_header ?? [] as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d+)#', $line, $m)) {
                $status = (int) $m[1];
                $headers = [];
                continue;
            }
            if (strpos($line, ':') !== false) {
                [$name, $value] = explode(':', $line, 2);
                $headers[strtolower(trim($name))] = trim($value);
            }
        }

        $body = ($raw === false || $raw === '') ? null : json_decode($raw, true);

        return ['status' => $status, 'headers' => $headers, 'body' => $body];
    }

    public function testNominalCases(): void
    {
        $cases = [
            ['add', 2, 3, 5],
            ['subtract', 10, 4, 6],
            ['multiply', 6, 7, 42],
            ['divide', 20, 5, 4],
            ['add', -5, -3, -8],
            ['multiply', -3, -4, 12],
        ];

        foreach ($cases as [$op, $a, $b, $expected]) {
            $res = $this->request("/calculate?operation=$op&a=$a&b=$b");
            $this->assertSame(200, $res['status'], "statut pour $op");
            $this->assertSame($expected, $res['body']['result'], "résultat pour $op($a,$b)");
            $this->assertSame($op, $res['body']['operation']);
        }
    }

    public function testResponseHeaders(): void
    {
        $res = $this->request('/calculate?operation=add&a=1&b=2');
        $this->assertSame('application/json; charset=utf-8', $res['headers']['content-type']);
        $this->assertSame('*', $res['headers']['access-control-allow-origin']);
    }

    public function testDecimalDivision(): void
    {
        $res = $this->request('/calculate?operation=divide&a=10&b=3');
        $this->assertSame(200, $res['status']);
        $this->assertEqualsWithDelta(3.333, $res['body']['result'], 0.01);
    }

    public function testOptionsPreflight(): void
    {
        $res = $this->request('/calculate', 'OPTIONS');
        $this->assertSame(204, $res['status']);
        $this->assertNull($res['body']);
        $this->assertSame('*', $res['headers']['access-control-allow-origin']);
        $this->assertStringContainsString('GET', $res['headers']['access-control-allow-methods']);
    }

    public function testMethodNotAllowed(): void
    {
        $res = $this->request('/calculate', 'POST');
        $this->assertSame(405, $res['status']);
        $this->assertArrayHasKey('error', $res['body']);
        $this->assertStringContainsString('GET', $res['headers']['allow']);
    }

    public function testMissingParamReturns400(): void
    {
        $res = $this->request('/calculate?operation=add&a=2');
        $this->assertSame(400, $res['status']);
        $this->assertMatchesRegularExpression('/Paramètres attendus/u', $res['body']['error']);
    }

    public function testNonNumericReturns400(): void
    {
        $res = $this->request('/calculate?operation=add&a=abc&b=3');
        $this->assertSame(400, $res['status']);
        $this->assertMatchesRegularExpression('/doivent être des nombres/u', $res['body']['error']);
    }

    public function testDivisionByZeroReturns400(): void
    {
        $res = $this->request('/calculate?operation=divide&a=10&b=0');
        $this->assertSame(400, $res['status']);
        $this->assertSame('Division par zéro impossible.', $res['body']['error']);
    }

    public function testUnknownOperationReturns400(): void
    {
        $res = $this->request('/calculate?operation=modulo&a=10&b=3');
        $this->assertSame(400, $res['status']);
        $this->assertMatchesRegularExpression('/Opération inconnue/u', $res['body']['error']);
    }

    public function testUnknownRouteReturns404(): void
    {
        $res = $this->request('/unknown');
        $this->assertSame(404, $res['status']);
        $this->assertSame('Route introuvable.', $res['body']['error']);
    }
}
