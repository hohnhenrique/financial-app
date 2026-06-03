<?php
declare(strict_types=1);
namespace App\Http\Routes;
use App\Core\Router;
use App\Http\Controllers\Api\{PersonalGoalController, PersonalHabitController, PersonalTaskController};

final class PersonalRoutes
{
    public static function register(Router $router): void
    {
        // Priorities (compartilhada)
        $router->get('/api/priorities', [PersonalGoalController::class, 'priorities']);

        // Metas pessoais
        $router->get('/api/personal/goals',          [PersonalGoalController::class, 'index']);
        $router->post('/api/personal/goals',         [PersonalGoalController::class, 'store']);
        $router->put('/api/personal/goals/{id}',     [PersonalGoalController::class, 'update']);
        $router->delete('/api/personal/goals/{id}',  [PersonalGoalController::class, 'delete']);

        // Hábitos
        $router->get('/api/personal/habits',              [PersonalHabitController::class, 'index']);
        $router->post('/api/personal/habits',             [PersonalHabitController::class, 'store']);
        $router->put('/api/personal/habits/{id}',         [PersonalHabitController::class, 'update']);
        $router->delete('/api/personal/habits/{id}',      [PersonalHabitController::class, 'delete']);
        $router->post('/api/personal/habits/{id}/log',    [PersonalHabitController::class, 'log']);

        // Tarefas
        $router->get('/api/personal/tasks',               [PersonalTaskController::class, 'index']);
        $router->post('/api/personal/tasks',              [PersonalTaskController::class, 'store']);
        $router->put('/api/personal/tasks/{id}',          [PersonalTaskController::class, 'update']);
        $router->put('/api/personal/tasks/{id}/status',   [PersonalTaskController::class, 'updateStatus']);
        $router->delete('/api/personal/tasks/{id}',       [PersonalTaskController::class, 'delete']);
    }
}
