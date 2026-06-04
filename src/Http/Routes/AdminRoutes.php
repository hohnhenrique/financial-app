<?php
declare(strict_types=1);
namespace App\Http\Routes;
use App\Core\Router;
use App\Http\Controllers\Api\AdminController;

final class AdminRoutes
{
    public static function register(Router $router): void
    {
        // Usuários
        $router->get('/api/admin/users',                       [AdminController::class, 'index']);
        $router->post('/api/admin/users',                      [AdminController::class, 'store']);
        $router->put('/api/admin/users/{id}',                  [AdminController::class, 'update']);
        $router->put('/api/admin/users/{id}/role',             [AdminController::class, 'toggleRole']);
        $router->put('/api/admin/users/{id}/active',           [AdminController::class, 'toggleActive']);
        $router->put('/api/admin/users/{id}/reset-password',   [AdminController::class, 'resetPassword']);
        $router->delete('/api/admin/users/{id}',               [AdminController::class, 'delete']);

        // Tokens de convite
        $router->get('/api/admin/invite-tokens',               [AdminController::class, 'listTokens']);
        $router->post('/api/admin/invite-tokens',              [AdminController::class, 'createToken']);
        $router->delete('/api/admin/invite-tokens/{id}',       [AdminController::class, 'revokeToken']);
    }
}
