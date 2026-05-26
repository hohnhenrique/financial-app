<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\SettingsController;

final class SettingsRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/settings', [SettingsController::class, 'index']);
        $router->put('/api/settings', [SettingsController::class, 'update']);
    }
}
