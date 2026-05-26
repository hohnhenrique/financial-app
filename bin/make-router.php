<?php

declare(strict_types=1);

$argv[1] = $argv[1] ?? null;

if (!$argv[1]) {
    echo "Uso: php bin/make-router.php NomeDaRota\n";
    exit(1);
}

$routeName = ucfirst($argv[1]);

$className = $routeName . 'Routes';
$controllerName = $routeName . 'Controller';

$routePath = strtolower($routeName);

$projectRoot = dirname(__DIR__);

$routeFile = $projectRoot . "/src/Http/Routes/{$className}.php";
$controllerFile = $projectRoot . "/src/Http/Controllers/Api/{$controllerName}.php";
$configRoutesFile = $projectRoot . "/config/routes.php";

/**
 * =========================================
 * Cria arquivo de rota
 * =========================================
 */
$routeTemplate = <<<PHP
<?php

declare(strict_types=1);

namespace App\Http\Routes;

use App\Core\Router;
use App\Http\Controllers\Api\\{$controllerName};

final class {$className}
{
    public static function register(Router \$router): void
    {
        \$router->get('/api/{$routePath}',         [{$controllerName}::class, 'index']);
        \$router->post('/api/{$routePath}',        [{$controllerName}::class, 'store']);
        \$router->get('/api/{$routePath}/{id}',    [{$controllerName}::class, 'show']);
        \$router->put('/api/{$routePath}/{id}',    [{$controllerName}::class, 'update']);
        \$router->delete('/api/{$routePath}/{id}', [{$controllerName}::class, 'delete']);
    }
}

PHP;

/**
 * =========================================
 * Cria controller
 * =========================================
 */
$controllerTemplate = <<<PHP
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

final class {$controllerName} extends ApiController
{
    public function index(): string
    {

    }

    public function store(): string
    {

    }

    public function show(string \$id): string
    {

    }

    public function update(string \$id): string
    {

    }

    public function delete(string \$id): string
    {

    }
}

PHP;

/**
 * =========================================
 * Verifica se arquivos já existem
 * =========================================
 */
if (file_exists($routeFile)) {
    echo "Arquivo de rota já existe: {$routeFile}\n";
    exit(1);
}

if (file_exists($controllerFile)) {
    echo "Controller já existe: {$controllerFile}\n";
    exit(1);
}

/**
 * =========================================
 * Cria arquivos
 * =========================================
 */
file_put_contents($routeFile, $routeTemplate);

echo "Arquivo criado: {$routeFile}\n";

file_put_contents($controllerFile, $controllerTemplate);

echo "Controller criado: {$controllerFile}\n";

/**
 * =========================================
 * Atualiza config/routes.php
 * =========================================
 */
$configContent = file_get_contents($configRoutesFile);

$useStatement = "use App\\Http\\Routes\\{$className};";

if (!str_contains($configContent, $useStatement)) {
    $configContent = preg_replace(
        '/(use App\\\\Http\\\\Routes\\\\.*?;(\r?\n))+/',
        "$0{$useStatement}\n",
        $configContent,
        1
    );
}

$registerLine = "{$className}::register(\$router);";

if (!str_contains($configContent, $registerLine)) {
    $configContent = preg_replace(
        '/(AdminRoutes::register\(\$router\);)/',
        "$1\n{$registerLine}",
        $configContent
    );
}

file_put_contents($configRoutesFile, $configContent);

echo "config/routes.php atualizado com sucesso.\n";