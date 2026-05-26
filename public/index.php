<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Container;
use App\Core\Env;
use App\Core\ExceptionHandler;
use App\Core\Middleware\CsrfMiddleware;
use App\Core\Middleware\RateLimitMiddleware;
use App\Core\Request;
use App\Core\View\Component;
use App\Infrastructure\Session\RedisSession;

// 1. Carrega env
Env::load(dirname(__DIR__) . '/.env');

// 2. Registra handler global de exceções (antes de tudo)
ExceptionHandler::register();

// 3. Inicia sessão
$session = new RedisSession();
$session->start();

// 4. Rate limiting (por IP e por usuário)
RateLimitMiddleware::handle();

// 5. CSRF (apenas em mutações)
$request = new Request();
CsrfMiddleware::handle($request->method);

// 6. Container DI
Component::setBasePath(dirname(__DIR__) . '/src/Views');
$container = new Container();
$container->singleton(RedisSession::class, fn() => $session);
require dirname(__DIR__) . '/config/bindings.php';

// 7. CORS
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['http://localhost:5173', 'http://localhost:3000'];
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, X-CSRF-Token');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// 8. Dispatch
$router = require dirname(__DIR__) . '/config/routes.php';
$router->dispatch($request, $container);
