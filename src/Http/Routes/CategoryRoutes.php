<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\CategoryController;

final class CategoryRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/categories',         [CategoryController::class, 'index']);
        $router->post('/api/categories',        [CategoryController::class, 'store']);
        $router->put('/api/categories/{id}',    [CategoryController::class, 'update']);
        $router->delete('/api/categories/{id}', [CategoryController::class, 'delete']);
    }
}
