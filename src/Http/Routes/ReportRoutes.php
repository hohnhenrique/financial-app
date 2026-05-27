<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\ReportController;

final class ReportRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/reports/summary', [ReportController::class, 'summary']);
    }
}
