<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\TransactionController;

final class TransactionRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/transactions',         [TransactionController::class, 'index']);
        $router->post('/api/transactions',        [TransactionController::class, 'store']);
        $router->get('/api/transactions/{id}',    [TransactionController::class, 'show']);
        $router->put('/api/transactions/{id}',    [TransactionController::class, 'update']);
        $router->delete('/api/transactions/{id}', [TransactionController::class, 'delete']);
    }
}
