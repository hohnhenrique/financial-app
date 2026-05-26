<?php

declare(strict_types=1);

namespace App\Core;

final class ViewRenderer
{
    private string $viewPath;

    public function __construct()
    {
        $this->viewPath = dirname(__DIR__) . '/Views';
    }

    public function render(string $view, array $data = [], bool $withLayout = true): string
    {
        $file = $this->viewPath . '/' . str_replace('.', '/', $view) . '.php';

        if (!file_exists($file)) {
            throw new \RuntimeException("View [{$view}] não encontrada em {$file}");
        }

        extract($data, EXTR_SKIP);

        ob_start();
        require $file;
        $content = ob_get_clean();

        if (!$withLayout) {
            return $content;
        }

        ob_start();
        require $this->viewPath . '/layout/base.php';
        return ob_get_clean();
    }

    public function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
