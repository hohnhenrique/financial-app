<?php

declare(strict_types=1);

namespace App\Infrastructure\Session;

final class RedisSession
{
    private \Redis $redis;
    private string $prefix;
    private int    $lifetime;
    private bool   $started = false;

    public function __construct()
    {
        $this->redis    = new \Redis();
        $this->redis->connect($_ENV['REDIS_HOST'] ?? 'redis', (int)($_ENV['REDIS_PORT'] ?? 6379));
        $this->prefix   = $_ENV['REDIS_PREFIX']      ?? 'finance:';
        $this->lifetime = (int)($_ENV['SESSION_LIFETIME'] ?? 480) * 60;
    }

    public function start(): void
    {
        if ($this->started || session_status() === PHP_SESSION_ACTIVE) {
            $this->started = true;
            return;
        }

        if (headers_sent($file, $line)) {
            throw new \RuntimeException("Cannot start session after output was sent in {$file}:{$line}");
        }

        session_set_save_handler(
            new RedisSessionHandler($this->redis, $this->prefix, $this->lifetime),
            true,
        );

        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);

        session_name('finance_session');
        session_start();

        $this->started = true;
    }

    public function set(string $key, mixed $value): void
    {
        $_SESSION[$key] = $value;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $_SESSION[$key] ?? $default;
    }

    public function has(string $key): bool
    {
        return isset($_SESSION[$key]);
    }

    public function forget(string $key): void
    {
        unset($_SESSION[$key]);
    }

    public function flash(string $key, mixed $value): void
    {
        $_SESSION['_flash'][$key] = $value;
    }

    public function getFlash(string $key, mixed $default = null): mixed
    {
        $value = $_SESSION['_flash'][$key] ?? $default;
        unset($_SESSION['_flash'][$key]);
        return $value;
    }

    public function destroy(): void
    {
        session_destroy();
        $_SESSION  = [];
        $this->started = false;
    }
}

final class RedisSessionHandler implements \SessionHandlerInterface
{
    public function __construct(
        private readonly \Redis $redis,
        private readonly string $prefix,
        private readonly int $lifetime,
    ) {}

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        return (string) ($this->redis->get($this->prefix . 'sess:' . $id) ?: '');
    }

    public function write(string $id, string $data): bool
    {
        return (bool) $this->redis->setex($this->prefix . 'sess:' . $id, $this->lifetime, $data);
    }

    public function destroy(string $id): bool
    {
        return (bool) $this->redis->del($this->prefix . 'sess:' . $id);
    }

    public function gc(int $max_lifetime): int|false
    {
        return 0;
    }
}
