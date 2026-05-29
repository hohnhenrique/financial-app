<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\NotificationController;

final class NotificationRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/notifications', [NotificationController::class, 'index']);
    }
}
