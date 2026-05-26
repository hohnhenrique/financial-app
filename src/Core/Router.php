<?php

declare(strict_types=1);

namespace App\Core;

final class Router
{
    private array $routes = [];

    public function get(string $uri, array $action): void    { $this->add('GET',    $uri, $action); }
    public function post(string $uri, array $action): void   { $this->add('POST',   $uri, $action); }
    public function put(string $uri, array $action): void    { $this->add('PUT',    $uri, $action); }
    public function delete(string $uri, array $action): void { $this->add('DELETE', $uri, $action); }

    private function add(string $method, string $uri, array $action): void
    {
        $this->routes[] = [$method, $uri, $action];
    }

    public function dispatch(Request $request, Container $container): void
    {
        // Suporte a _method para forms HTML (não necessário com React, mas útil)
        $method = $request->method;
        if ($method === 'POST' && isset($_POST['_method'])) {
            $method = strtoupper($_POST['_method']);
        }

        foreach ($this->routes as [$routeMethod, $uri, [$controllerClass, $controllerMethod]]) {
            $pattern = preg_replace('/\{[a-zA-Z_]+\}/', '([^/]+)', $uri);
            $pattern = "#^{$pattern}$#";

            if ($method !== $routeMethod) continue;
            if (!preg_match($pattern, $request->uri, $matches)) continue;

            array_shift($matches);

            $controller = $container->make($controllerClass);
            $result     = call_user_func_array([$controller, $controllerMethod], $matches);

            if (is_string($result)) echo $result;
            return;
        }

        Response::abort(404, json_encode(['error' => 'Not found']));
    }
}
