<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Log\Logger;
use App\Core\Validation\ValidationException;
use Throwable;

final class ExceptionHandler
{
    public static function register(): void
    {
        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) return false;
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });

        set_exception_handler(static function (Throwable $e): void {
            self::handle($e);
        });

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

        $context = [
            'exception' => get_class($e),
            'message'   => $e->getMessage(),
            'file'      => $e->getFile(),
            'line'      => $e->getLine(),
            'url'       => $_SERVER['REQUEST_URI'] ?? '',
            'method'    => $_SERVER['REQUEST_METHOD'] ?? '',
        ];

        if ($statusCode >= 500) {
            Logger::critical("Unhandled exception: {$e->getMessage()}", $context);
        } elseif ($statusCode >= 400) {
            Logger::warning("Client error: {$e->getMessage()}", $context);
        }

        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
        }

        $response = [
            'success' => false,
            'message' => self::userMessage($e, $isDebug),
        ];

        // Retorna erros de validação estruturados
        if ($e instanceof ValidationException) {
            $response['errors'] = $e->getErrors();
        }

        if ($isDebug && $statusCode >= 500) {
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
        Logger::critical('Fatal PHP error', $error);
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
        }
        echo json_encode(['success' => false, 'message' => 'Erro interno do servidor.']);
    }

    private static function statusCode(Throwable $e): int
    {
        return match (true) {
            $e instanceof ValidationException                              => 422,
            $e instanceof \InvalidArgumentException                       => 422,
            $e instanceof \RuntimeException &&
                str_contains($e->getMessage(), 'não encontrad')           => 404,
            $e instanceof \RuntimeException &&
                str_contains($e->getMessage(), 'não autorizado')          => 403,
            $e instanceof \PDOException                                   => 500,
            default                                                       => 500,
        };
    }

    private static function userMessage(Throwable $e, bool $debug): string
    {
        if ($e instanceof ValidationException) return $e->getFirstError();
        if ($e instanceof \InvalidArgumentException) return $e->getMessage();
        if ($e instanceof \RuntimeException) return $e->getMessage();
        return $debug ? $e->getMessage() : 'Ocorreu um erro interno. Tente novamente.';
    }
}
