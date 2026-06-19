<?php

declare(strict_types=1);

namespace Aurora;

class Router
{
    private const ALLOWED = ['add', 'subtract', 'multiply', 'divide'];

    /**
     * @param string               $method  Méthode HTTP
     * @param string               $path    Chemin (sans query string)
     * @param array<string,string> $query   Paramètres de query string
     *
     * @return array{status:int,headers:array<string,string>,body:?string}
     */
    public function handle(string $method, string $path, array $query): array
    {
        $headers = [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization',
            'Content-Type' => 'application/json; charset=utf-8',
        ];

        if ($method === 'OPTIONS') {
            return ['status' => 204, 'headers' => $headers, 'body' => null];
        }

        if ($method !== 'GET') {
            $headers['Allow'] = 'GET, OPTIONS';

            return $this->json(405, $headers, ['error' => 'Méthode non autorisée. Utiliser GET.']);
        }

        if ($path !== '/calculate') {
            return $this->json(404, $headers, ['error' => 'Route introuvable.']);
        }

        $operation = $query['operation'] ?? null;
        $a = $query['a'] ?? null;
        $b = $query['b'] ?? null;

        if ($operation === null || $a === null || $b === null) {
            return $this->json(400, $headers, ['error' => 'Paramètres attendus : operation, a, b']);
        }

        if (!$this->isNumeric($a) || !$this->isNumeric($b)) {
            return $this->json(400, $headers, ['error' => 'Les paramètres a et b doivent être des nombres.']);
        }

        if (!in_array($operation, self::ALLOWED, true)) {
            return $this->json(400, $headers, [
                'error' => 'Opération inconnue. Utiliser : add, subtract, multiply, divide',
            ]);
        }

        $numA = $this->toNumber($a);
        $numB = $this->toNumber($b);
        $calc = new Calculator();

        try {
            switch ($operation) {
                case 'add':
                    $result = $calc->add($numA, $numB);
                    break;
                case 'subtract':
                    $result = $calc->subtract($numA, $numB);
                    break;
                case 'multiply':
                    $result = $calc->multiply($numA, $numB);
                    break;
                default:
                    $result = $calc->divide($numA, $numB);
            }
        } catch (\InvalidArgumentException $e) {
            return $this->json(400, $headers, ['error' => $e->getMessage()]);
        }

        return $this->json(200, $headers, [
            'operation' => $operation,
            'a' => $this->normalize($numA),
            'b' => $this->normalize($numB),
            'result' => $this->normalize($result),
        ]);
    }

    private function isNumeric(string $value): bool
    {
        return is_numeric(trim($value));
    }

    private function toNumber(string $value): float
    {
        return (float) trim($value);
    }


    private function normalize(float $value)
    {
        if (!is_finite($value)) {
            return null;
        }

        if ($value == (int) $value && abs($value) < PHP_INT_MAX) {
            return (int) $value;
        }

        return $value;
    }


    private function json(int $status, array $headers, array $payload): array
    {
        return [
            'status' => $status,
            'headers' => $headers,
            'body' => json_encode($payload, JSON_UNESCAPED_UNICODE),
        ];
    }
}
