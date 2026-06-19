<?php

declare(strict_types=1);

require __DIR__ . '/../src/Calculator.php';
require __DIR__ . '/../src/Router.php';

use Aurora\Router;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

$response = (new Router())->handle($method, $path, $_GET);

http_response_code($response['status']);
foreach ($response['headers'] as $name => $value) {
    header($name . ': ' . $value);
}
if ($response['body'] !== null) {
    echo $response['body'];
}
