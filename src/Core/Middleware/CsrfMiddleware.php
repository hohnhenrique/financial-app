<?php

declare(strict_types=1);

namespace App\Core\Middleware;

final class CsrfMiddleware
{
    private const SAFE_METHODS  = ['GET', 'HEAD', 'OPTIONS'];
    private const TOKEN_KEY     = '_csrf_token';
    private const HEADER_NAME   = 'X-CSRF-Token';

    public static function generateToken(): string
    {
        if (empty($_SESSION[self::TOKEN_KEY])) {
            $_SESSION[self::TOKEN_KEY] = bin2hex(random_bytes(32));
        }
        return $_SESSION[self::TOKEN_KEY];
    }

    public static function handle(string $method): void
    {
        // Rotas seguras não precisam de token
        if (in_array($method, self::SAFE_METHODS, strict: true)) return;

        // Rota de login/register dispensada (sessão ainda não existe)
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if (in_array($uri, ['/api/auth/login', '/api/auth/register'], strict: true)) return;

        // Valida o header enviado pelo React
        $token  = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $stored = $_SESSION[self::TOKEN_KEY]    ?? '';

        if (!$stored || !hash_equals($stored, $token)) {
            http_response_code(419);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'CSRF token inválido.']);
            exit;
        }
    }
}
