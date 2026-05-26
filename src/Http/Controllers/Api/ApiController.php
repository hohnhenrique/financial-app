<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Infrastructure\Session\RedisSession;

abstract class ApiController
{
    public function __construct(
        protected readonly RedisSession $session,
    ) {}

    protected function json(mixed $data, int $status = 200): string
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        return json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    protected function success(mixed $data = null, string $message = 'OK', int $status = 200): string
    {
        return $this->json(['success' => true, 'message' => $message, 'data' => $data], $status);
    }

    protected function error(string $message, int $status = 400, mixed $errors = null): string
    {
        return $this->json(['success' => false, 'message' => $message, 'errors' => $errors], $status);
    }

    protected function userId(): int
    {
        return (int) $this->session->get('user_id');
    }

    protected function body(): array
    {
        $raw = file_get_contents('php://input');
        return json_decode($raw ?: '{}', true) ?? [];
    }

    protected function requireAuth(): void
    {
        if (!$this->session->has('user_id')) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Não autenticado.']);
            exit;
        }
    }
}
