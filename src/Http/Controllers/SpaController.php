<?php

declare(strict_types=1);

namespace App\Http\Controllers;

final class SpaController
{
    public function index(): string
    {
        $indexFile = dirname(__DIR__, 3) . '/public/app/index.html';

        if (! file_exists($indexFile)) {
            http_response_code(503);
            return '<h1 style="font-family:sans-serif;padding:2rem">Frontend não compilado.<br><small>Rode: <code>cd frontend && npm run build</code></small></h1>';
        }

        return file_get_contents($indexFile);
    }
}
