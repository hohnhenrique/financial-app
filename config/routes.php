<?php

declare(strict_types=1);

use App\Core\Router;
use App\Http\Controllers\SpaController;
use App\Http\Routes\AuthRoutes;
use App\Http\Routes\DashboardRoutes;
use App\Http\Routes\TransactionRoutes;
use App\Http\Routes\AccountRoutes;
use App\Http\Routes\CategoryRoutes;
use App\Http\Routes\ProfileRoutes;
use App\Http\Routes\AdminRoutes;
use App\Http\Routes\GoalsRoutes;
use App\Http\Routes\SettingsRoutes;
use App\Http\Routes\ImportRoutes;
use App\Http\Routes\GoalRoutes;

$router = new Router();

AuthRoutes::register($router);
DashboardRoutes::register($router);
TransactionRoutes::register($router);
AccountRoutes::register($router);
CategoryRoutes::register($router);
ProfileRoutes::register($router);
AdminRoutes::register($router);
SettingsRoutes::register($router);
ImportRoutes::register($router);
GoalRoutes::register($router);

// SPA fallback - qualquer rota não-API serve o React
$router->get('/{any}', [SpaController::class, 'index']);

return $router;
