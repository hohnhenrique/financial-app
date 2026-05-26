<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Response;
use App\Infrastructure\Session\RedisSession;

final class AdminMiddleware
{
    private const ADMIN_ROUTES = ['/admin', '/admin/users'];

    public function __construct(private readonly RedisSession $session) {}

    public function handle(string $uri): void
    {
        $isAdminRoute = str_starts_with($uri, '/admin');

        if ($isAdminRoute && $this->session->get('user_role') !== 'admin') {
            Response::abort(403, '<h1 style="font-family:sans-serif;padding:2rem">403 — Acesso negado</h1>');
        }
    }
}
