<?php
declare(strict_types=1);
namespace App\Http\Routes;
use App\Core\Router;
use App\Http\Controllers\Api\BudgetController;

final class BudgetRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/budgets',  [BudgetController::class, 'index']);
        $router->post('/api/budgets', [BudgetController::class, 'upsert']);
    }
}
