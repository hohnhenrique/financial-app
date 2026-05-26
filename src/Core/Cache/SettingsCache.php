<?php

declare(strict_types=1);

namespace App\Core\Cache;

use App\Core\Database\Connection;
use App\Core\Log\Logger;

final class SettingsCache
{
    private const TTL    = 300; // 5 minutos
    private const PREFIX = 'settings:user:';

    public static function get(int|string $userId): array
    {
        try {
            $redis = self::redis();
            $key   = self::PREFIX . $userId;
            $cached = $redis->get($key);

            if ($cached !== false) {
                return json_decode($cached, true);
            }
        } catch (\Throwable $e) {
            Logger::warning('Settings cache read failed', ['error' => $e->getMessage()]);
        }

        return self::fromDb($userId);
    }

    public static function forget(int|string $userId): void
    {
        try {
            self::redis()->del(self::PREFIX . $userId);
        } catch (\Throwable) {}
    }

    private static function fromDb(int|string $userId): array
    {
        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM user_settings WHERE user_id = ?');
        $stmt->execute([$userId]);
        $settings = $stmt->fetch() ?: self::defaults();

        try {
            $redis = self::redis();
            $redis->setex(self::PREFIX . $userId, self::TTL, json_encode($settings));
        } catch (\Throwable) {}

        return $settings;
    }

    private static function defaults(): array
    {
        return [
            'session_lifetime'   => 480,
            'primary_color'      => '#1B4F8A',
            'sidebar_color_from' => '#0f172a',
            'sidebar_color_to'   => '#1e293b',
        ];
    }

    private static function redis(): \Redis
    {
        $r = new \Redis();
        $r->connect($_ENV['REDIS_HOST'] ?? 'redis', (int)($_ENV['REDIS_PORT'] ?? 6379));
        $r->setOption(\Redis::OPT_PREFIX, $_ENV['REDIS_PREFIX'] ?? 'finance:');
        return $r;
    }
}
