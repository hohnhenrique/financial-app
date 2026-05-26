<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Log\Logger;

final class RateLimitMiddleware
{
    // Por IP: 200 req/min (mais permissivo, para evitar falsos positivos)
    private const IP_LIMIT      = 200;
    private const IP_WINDOW     = 60;

    // Por usuário autenticado: 100 req/min
    private const USER_LIMIT    = 100;
    private const USER_WINDOW   = 60;

    // Rotas que têm limite mais rígido (auth)
    private const STRICT_ROUTES = ['/api/auth/login', '/api/auth/register'];
    private const STRICT_LIMIT  = 10;
    private const STRICT_WINDOW = 300; // 5 minutos

    public static function handle(): void
    {
        try {
            $redis  = new \Redis();
            $redis->connect($_ENV['REDIS_HOST'] ?? 'redis', (int)($_ENV['REDIS_PORT'] ?? 6379));
            $prefix = $_ENV['REDIS_PREFIX'] ?? 'finance:';
            $uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

            // Limite estrito para auth
            if (in_array($uri, self::STRICT_ROUTES, strict: true)) {
                self::check($redis, $prefix . 'rl:strict:' . self::clientIp(), self::STRICT_LIMIT, self::STRICT_WINDOW, 'Muitas tentativas. Aguarde 5 minutos.');
                return;
            }

            // Limite por IP
            self::check($redis, $prefix . 'rl:ip:' . self::clientIp(), self::IP_LIMIT, self::IP_WINDOW);

            // Limite por usuário autenticado (mais restrito)
            if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['user_id'])) {
                self::check($redis, $prefix . 'rl:user:' . $_SESSION['user_id'], self::USER_LIMIT, self::USER_WINDOW);
            }
        } catch (\Throwable $e) {
            // Se o Redis falhar, não bloqueia a requisição
            Logger::warning('RateLimitMiddleware failed', ['error' => $e->getMessage()]);
        }
    }

    private static function check(\Redis $redis, string $key, int $limit, int $window, string $message = 'Muitas requisições. Tente novamente em instantes.'): void
    {
        $count = (int) $redis->incr($key);

        if ($count === 1) {
            $redis->expire($key, $window);
        }

        if ($count > $limit) {
            $ttl = $redis->ttl($key);
            Logger::warning('Rate limit exceeded', ['key' => $key, 'count' => $count, 'ttl' => $ttl]);
            http_response_code(429);
            header('Content-Type: application/json');
            header("Retry-After: {$ttl}");
            echo json_encode(['success' => false, 'message' => $message]);
            exit;
        }
    }

    private static function clientIp(): string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
