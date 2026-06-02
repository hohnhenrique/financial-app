<?php

declare(strict_types=1);

namespace App\Core\Log;

use Monolog\Handler\RotatingFileHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger as MonologLogger;
use Monolog\Formatter\JsonFormatter;
use Monolog\LogRecord;
use Monolog\Processor\IntrospectionProcessor;
use Monolog\Processor\WebProcessor;

final class Logger
{
    private static ?MonologLogger $instance = null;

    public static function get(): MonologLogger
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $logger    = new MonologLogger('finance');
        $logPath   = dirname(__DIR__, 3) . '/storage/logs';
        $isDebug   = ($_ENV['APP_DEBUG'] ?? 'false') === 'true';
        $formatter = new JsonFormatter();

        // Cria o diretório se não existir
        if (!is_dir($logPath)) {
            mkdir($logPath, 0755, recursive: true);
        }

        // Arquivo rotativo — 1 por dia, mantém 30 dias
        $rotating = new RotatingFileHandler(
            filename: $logPath . '/app.log',
            maxFiles: 30,
            level:    $isDebug ? Level::Debug : Level::Info,
        );
        $rotating->setFormatter($formatter);
        $logger->pushHandler($rotating);

        // Erros graves em arquivo separado
        $errorHandler = new StreamHandler(
            stream: $logPath . '/error.log',
            level:  Level::Error,
        );
        $errorHandler->setFormatter($formatter);
        $logger->pushHandler($errorHandler);

        // Contexto automático de arquivo/linha — excluindo o próprio Logger
        $logger->pushProcessor(new IntrospectionProcessor(
            Level::Debug,
            ['App\\Core\\Log']
        ));

        // Contexto HTTP
        $logger->pushProcessor(new WebProcessor());

        // Processor compatível com Monolog v3 — recebe LogRecord, retorna LogRecord
        $logger->pushProcessor(static function (LogRecord $record): LogRecord {
            if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['user_id'])) {
                // LogRecord é imutável no Monolog v3 — usa with() para clonar com alteração
                return $record->with(extra: array_merge(
                    $record->extra,
                    ['user_id' => $_SESSION['user_id']]
                ));
            }
            return $record;
        });

        self::$instance = $logger;
        return $logger;
    }

    // ── Atalhos estáticos ─────────────────────────────────────────────────────

    public static function debug(string $message, array $context = []): void
    {
        self::get()->debug($message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::get()->info($message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::get()->warning($message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::get()->error($message, $context);
    }

    public static function critical(string $message, array $context = []): void
    {
        self::get()->critical($message, $context);
    }
}
