<?php

declare(strict_types=1);

namespace App\Core\View;

final class Component
{
    private static string $basePath = '';

    public static function setBasePath(string $path): void
    {
        self::$basePath = rtrim($path, '/');
    }

    public static function render(string $name, array $data = []): string
    {
        $file = self::$basePath . '/components/' . $name . '.php';

        if (!file_exists($file)) {
            throw new \RuntimeException("Componente [{$name}] não encontrado.");
        }

        extract($data, EXTR_SKIP);
        ob_start();
        require $file;
        return ob_get_clean();
    }
}
