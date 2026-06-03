<?php
declare(strict_types=1);
namespace App\Http\Routes;
use App\Core\Router;
use App\Http\Controllers\Api\SearchController;

final class SearchRoutes
{
    public static function register(Router $router): void
    {
        $router->get('/api/search', [SearchController::class, 'search']);
    }
}
