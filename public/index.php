<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Container;
use App\Core\Env;
use App\Core\ExceptionHandler;
use App\Core\Middleware\CsrfMiddleware;
use App\Core\Middleware\RateLimitMiddleware;
use App\Core\Request;
use App\Infrastructure\Session\RedisSession;

// ── 1. Registra handler de exceções ANTES de tudo ─────────────────────────────
ExceptionHandler::register();

// ── 2. Carrega e valida o .env ────────────────────────────────────────────────
Env::load(dirname(__DIR__) . '/.env');

Env::require('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'REDIS_HOST');

Env::validate([
    'DB_PORT'    => ['type' => 'int',  'required' => false],
    'REDIS_PORT' => ['type' => 'int',  'required' => false],
    'APP_DEBUG'  => ['type' => 'bool', 'required' => false],
]);

// ── 3. CORS ───────────────────────────────────────────────────────────────────
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_filter(explode(',', Env::get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')));

if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, X-CSRF-Token');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── 4. Sessão ─────────────────────────────────────────────────────────────────
$session = new RedisSession();
$session->start();

// ── 5. Rate limiting ──────────────────────────────────────────────────────────
RateLimitMiddleware::handle();

// ── 6. CSRF ───────────────────────────────────────────────────────────────────
$request = new Request();
CsrfMiddleware::handle($request->method);

// ── 7. Container DI ───────────────────────────────────────────────────────────
$container = new Container();
$container->instance(RedisSession::class, $session);
require dirname(__DIR__) . '/config/bindings.php';

// ── 8. Dispatch ───────────────────────────────────────────────────────────────
$router = require dirname(__DIR__) . '/config/routes.php';
$router->dispatch($request, $container);
