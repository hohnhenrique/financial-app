<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Response;
use App\Infrastructure\Session\RedisSession;

final class AuthMiddleware
{
    private const PUBLIC_ROUTES = ['/login', '/register'];

    public function __construct(private readonly RedisSession $session) {}

    public function handle(string $uri, string $method): void
    {
        if (in_array($uri, self::PUBLIC_ROUTES, strict: true)) return;

        if (!$this->session->has('user_id')) {
            Response::redirect('/login');
        }
    }
}
