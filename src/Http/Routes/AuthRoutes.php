<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\AuthController;

final class AuthRoutes
{
    public static function register(Router $router): void
    {
        $router->post('/api/auth/login',    [AuthController::class, 'login']);
        $router->post('/api/auth/register', [AuthController::class, 'register']);
        $router->post('/api/auth/logout',   [AuthController::class, 'logout']);
        $router->get('/api/auth/me',        [AuthController::class, 'me']);
    }
}
