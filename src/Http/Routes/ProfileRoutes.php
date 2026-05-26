<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\ProfileController;

final class ProfileRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/profile',           [ProfileController::class, 'index']);
        $router->put('/api/profile',           [ProfileController::class, 'update']);
        $router->put('/api/profile/password',  [ProfileController::class, 'updatePassword']);
    }
}
