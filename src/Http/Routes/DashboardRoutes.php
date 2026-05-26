<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\DashboardController;

final class DashboardRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/dashboard', [DashboardController::class, 'index']);
    }
}
