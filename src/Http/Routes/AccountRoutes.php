<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\AccountController;

final class AccountRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/accounts',         [AccountController::class, 'index']);
        $router->post('/api/accounts',        [AccountController::class, 'store']);
        $router->get('/api/accounts/{id}',    [AccountController::class, 'show']);
        $router->put('/api/accounts/{id}',    [AccountController::class, 'update']);
        $router->delete('/api/accounts/{id}', [AccountController::class, 'delete']);
    }
}
