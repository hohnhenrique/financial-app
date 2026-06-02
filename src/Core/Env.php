<?php

declare(strict_types=1);

namespace App\Core;

final class Env
{
    private static bool $loaded = false;

    public static function load(string $path): void
    {
        if (self::$loaded) return;

        if (!file_exists($path)) {
            throw new \RuntimeException(".env não encontrado em: {$path}");
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;
            if (!str_contains($line, '=')) continue;

            [$key, $value] = explode('=', $line, 2);
            $key   = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");

            if (!isset($_ENV[$key])) {
                $_ENV[$key]    = $value;
                $_SERVER[$key] = $value;
                putenv("{$key}={$value}");
            }
        }

        self::$loaded = true;
    }

    // ── Leitura ───────────────────────────────────────────────────────────────

    public static function get(string $key, ?string $default = null): ?string
    {
        return $_ENV[$key] ?? $default;
    }

    public static function int(string $key, int $default = 0): int
    {
        return (int)($_ENV[$key] ?? $default);
    }

    public static function bool(string $key, bool $default = false): bool
    {
        if (!isset($_ENV[$key])) return $default;
        return in_array(strtolower($_ENV[$key]), ['true', '1', 'yes', 'on'], true);
    }

    // ── Validação ─────────────────────────────────────────────────────────────

    public static function require(string ...$keys): void
    {
        $missing = [];
        foreach ($keys as $key) {
            if (empty($_ENV[$key])) {
                $missing[] = $key;
            }
        }

        if (!empty($missing)) {
            throw new \RuntimeException(
                'Variáveis de ambiente obrigatórias não definidas: ' . implode(', ', $missing) . "\n" .
                'Verifique o arquivo .env'
            );
        }
    }

    public static function validate(array $rules): void
    {
        $errors = [];

        foreach ($rules as $key => $rule) {
            $value    = $_ENV[$key] ?? null;
            $required = $rule['required'] ?? false; // ← padrão false para campos em validate()

            // Se vazio/ausente
            if ($value === null || $value === '') {
                if ($required) {
                    $errors[] = "{$key} é obrigatório";
                }
                // Se não obrigatório e ausente, pula todas as outras validações
                continue;
            }

            // Valida tipo
            $typeOk = match ($rule['type'] ?? 'string') {
                'int'   => is_numeric($value),
                'bool'  => in_array(strtolower($value), ['true','false','1','0','yes','no','on','off']),
                'url'   => (bool) filter_var($value, FILTER_VALIDATE_URL),
                'email' => (bool) filter_var($value, FILTER_VALIDATE_EMAIL),
                default => true,
            };

            if (!$typeOk) {
                $errors[] = match ($rule['type'] ?? 'string') {
                    'int'   => "{$key} deve ser um número inteiro",
                    'bool'  => "{$key} deve ser true/false",
                    'url'   => "{$key} deve ser uma URL válida",
                    'email' => "{$key} deve ser um e-mail válido",
                    default => "{$key} tipo inválido",
                };
                continue;
            }

            // Valida enum (in)
            if (isset($rule['in']) && !in_array($value, $rule['in'], true)) {
                $errors[] = "{$key} deve ser um de: " . implode(', ', $rule['in']);
            }

            // Valida tamanho mínimo
            if (isset($rule['min']) && strlen($value) < $rule['min']) {
                $errors[] = "{$key} deve ter pelo menos {$rule['min']} caracteres";
            }

            // Valida tamanho máximo
            if (isset($rule['max']) && strlen($value) > $rule['max']) {
                $errors[] = "{$key} deve ter no máximo {$rule['max']} caracteres";
            }
        }

        if (!empty($errors)) {
            throw new \RuntimeException(
                "Configuração inválida no .env:\n  - " . implode("\n  - ", $errors)
            );
        }
    }
}
