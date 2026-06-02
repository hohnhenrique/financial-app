<?php

declare(strict_types=1);

use App\Core\Container;
use App\Core\Database\Connection;
use App\Infrastructure\Session\RedisSession;

// ── Singletons (uma instância por request) ─────────────────────────────────────

// PDO — conexão única com o banco
$container->singleton(\PDO::class, fn() => Connection::get());

// Redis — conexão única com o Redis
$container->singleton(\Redis::class, function () {
    $r = new \Redis();
    $r->connect($_ENV['REDIS_HOST'] ?? 'redis', (int)($_ENV['REDIS_PORT'] ?? 6379));
    if (!empty($_ENV['REDIS_PASSWORD'])) {
        $r->auth($_ENV['REDIS_PASSWORD']);
    }
    $r->setOption(\Redis::OPT_PREFIX, $_ENV['REDIS_PREFIX'] ?? 'finance:');
    return $r;
});

// ── Repositories ───────────────────────────────────────────────────────────────

$container->bind(
    \App\Domain\Transaction\TransactionRepositoryInterface::class,
    fn(Container $c) => new \App\Infrastructure\Repository\PdoTransactionRepository($c->make(\PDO::class))
);

$container->bind(
    \App\Domain\Account\AccountRepositoryInterface::class,
    fn(Container $c) => new \App\Infrastructure\Repository\PdoAccountRepository($c->make(\PDO::class))
);

$container->bind(
    \App\Domain\Category\CategoryRepositoryInterface::class,
    fn(Container $c) => new \App\Infrastructure\Repository\PdoCategoryRepository($c->make(\PDO::class))
);

// ── Services ───────────────────────────────────────────────────────────────────

$container->bind(
    \App\Domain\Transaction\TransactionService::class,
    fn(Container $c) => new \App\Domain\Transaction\TransactionService(
        $c->make(\App\Domain\Transaction\TransactionRepositoryInterface::class)
    )
);

$container->bind(
    \App\Domain\Account\AccountService::class,
    fn(Container $c) => new \App\Domain\Account\AccountService(
        $c->make(\App\Domain\Account\AccountRepositoryInterface::class)
    )
);

$container->bind(
    \App\Domain\Category\CategoryService::class,
    fn(Container $c) => new \App\Domain\Category\CategoryService(
        $c->make(\App\Domain\Category\CategoryRepositoryInterface::class)
    )
);
