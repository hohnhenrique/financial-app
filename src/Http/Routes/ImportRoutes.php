<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\ImportController;

final class ImportRoutes
{
    public static function register(Router $router): void
    {
        // Preview: envia o CSV, recebe as linhas parseadas para o usuário revisar
        $router->post('/api/import/preview', [ImportController::class, 'preview']);

        // Importar: confirma as transações selecionadas
        $router->post('/api/import/confirm', [ImportController::class, 'import']);
    }
}
