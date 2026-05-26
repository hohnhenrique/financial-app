<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Log\Logger;
use Throwable;

final class ExceptionHandler
{
    public static function register(): void
    {
        // Captura erros PHP (notices, warnings, etc.) e converte em exceções
        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) return false;
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        // Captura exceções não tratadas
        set_exception_handler(static function (Throwable $e): void {
            self::handle($e);
        });

        // Captura erros fatais (parse errors, out of memory, etc.)
        register_shutdown_function(static function (): void {
            $error = error_get_last();
            if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
                self::handleFatal($error);
            }
        });
    }

    public static function handle(Throwable $e): void
    {
        $statusCode = self::statusCode($e);
        $isDebug    = ($_ENV['APP_DEBUG'] ?? 'false') === 'true';

        // Log estruturado
        $context = [
            'exception' => get_class($e),
            'message'   => $e->getMessage(),
            'file'      => $e->getFile(),
            'line'      => $e->getLine(),
            'trace'     => $e->getTraceAsString(),
            'url'       => $_SERVER['REQUEST_URI'] ?? '',
            'method'    => $_SERVER['REQUEST_METHOD'] ?? '',
        ];

        if ($statusCode >= 500) {
            Logger::critical("Unhandled exception: {$e->getMessage()}", $context);
        } elseif ($statusCode >= 400) {
            Logger::warning("Client error: {$e->getMessage()}", $context);
        } else {
            Logger::error("Exception: {$e->getMessage()}", $context);
        }

        // Resposta JSON para o React
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
        }

        $response = [
            'success' => false,
            'message' => self::userMessage($e, $isDebug),
        ];

        if ($isDebug) {
            $response['debug'] = [
                'exception' => get_class($e),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
                'trace'     => explode("\n", $e->getTraceAsString()),
            ];
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    private static function handleFatal(array $error): void
    {
        Logger::critical('Fatal PHP error', [
            'type'    => $error['type'],
            'message' => $error['message'],
            'file'    => $error['file'],
            'line'    => $error['line'],
        ]);

        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }

        echo json_encode([
            'success' => false,
            'message' => 'Erro interno do servidor.',
        ]);
    }

    private static function statusCode(Throwable $e): int
    {
        return match (true) {
            $e instanceof \InvalidArgumentException          => 422,
            $e instanceof \RuntimeException &&
                str_contains($e->getMessage(), 'não encontrad') => 404,
            $e instanceof \RuntimeException &&
                str_contains($e->getMessage(), 'não autorizado')=> 403,
            $e instanceof \PDOException                     => 500,
            default                                         => 500,
        };
    }

    private static function userMessage(Throwable $e, bool $debug): string
    {
        // Exceções de domínio expõem a mensagem diretamente
        if ($e instanceof \InvalidArgumentException || $e instanceof \RuntimeException) {
            return $e->getMessage();
        }

        // Em debug, mostra tudo; em produção, mensagem genérica
        if ($debug) {
            return $e->getMessage();
        }

        return 'Ocorreu um erro interno. Tente novamente.';
    }
}
