<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\AdminController;

final class AdminRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/admin/users',              [AdminController::class, 'index']);
        $router->put('/api/admin/users/{id}/role',    [AdminController::class, 'toggleRole']);
        $router->delete('/api/admin/users/{id}',      [AdminController::class, 'delete']);
    }
}
