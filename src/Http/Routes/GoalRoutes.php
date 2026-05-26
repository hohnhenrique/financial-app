<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\GoalController;

final class GoalRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/goals',                    [GoalController::class, 'index']);
        $router->get('/api/goals/{yearMonth}',        [GoalController::class, 'forMonth']);
        $router->post('/api/goals',                   [GoalController::class, 'upsert']);
        $router->delete('/api/goals/{id}',            [GoalController::class, 'delete']);
    }
}
