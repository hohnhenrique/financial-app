<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Env;

Env::load(dirname(__DIR__) . '/.env');

$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=%s',
        $_ENV['DB_HOST'], $_ENV['DB_PORT'], $_ENV['DB_NAME']),
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

// Garante que a tabela de controle existe
$pdo->exec("
    CREATE TABLE IF NOT EXISTS migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        ran_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
");

$command = $argv[1] ?? 'up';
$steps   = isset($argv[2]) ? (int) $argv[2] : 1;

$allFiles = glob(dirname(__DIR__) . '/database/migrations/*.php');
sort($allFiles);

$ran = $pdo->query("SELECT filename FROM migrations ORDER BY id")
           ->fetchAll(PDO::FETCH_COLUMN);

// ── UP ────────────────────────────────────────────────────────────────────────
if ($command === 'up') {
    $pending = array_filter($allFiles, fn($f) => !in_array(basename($f), $ran));

    if (empty($pending)) {
        echo "\n  Nenhuma migration pendente. Banco está atualizado. ✅\n\n";
        exit(0);
    }

    echo "\n  Rodando migrations...\n\n";

    foreach ($pending as $file) {
        $name = basename($file);
        try {
            $pdo->beginTransaction();
            $migration = require $file;
            $migration->up($pdo);
            $pdo->prepare("INSERT INTO migrations (filename) VALUES (?)")->execute([$name]);
            $pdo->commit();
            echo "  ✅  {$name}\n";
        } catch (\Throwable $e) {
            $pdo->rollBack();
            echo "  ❌  {$name} - ERRO: {$e->getMessage()}\n";
            exit(1);
        }
    }

    echo "\n  Migrations concluídas com sucesso! ✅\n\n";
}

// ── ROLLBACK ──────────────────────────────────────────────────────────────────
elseif ($command === 'rollback') {
    $toRollback = $pdo->query("
        SELECT filename FROM migrations ORDER BY id DESC LIMIT {$steps}
    ")->fetchAll(PDO::FETCH_COLUMN);

    if (empty($toRollback)) {
        echo "\n  Nenhuma migration para reverter.\n\n";
        exit(0);
    }

    echo "\n  Revertendo {$steps} migration(s)...\n\n";

    foreach ($toRollback as $name) {
        $file = dirname(__DIR__) . '/database/migrations/' . $name;

        if (!file_exists($file)) {
            echo "  ⚠️   {$name} - arquivo não encontrado, pulando.\n";
            continue;
        }

        try {
            $pdo->beginTransaction();
            $migration = require $file;
            $migration->down($pdo);
            $pdo->prepare("DELETE FROM migrations WHERE filename = ?")->execute([$name]);
            $pdo->commit();
            echo "  ↩️   {$name}\n";
        } catch (\Throwable $e) {
            $pdo->rollBack();
            echo "  ❌  {$name} - ERRO: {$e->getMessage()}\n";
            exit(1);
        }
    }

    echo "\n  Rollback concluído! ↩️\n\n";
}

// ── STATUS ────────────────────────────────────────────────────────────────────
elseif ($command === 'status') {
    echo "\n  Status das migrations:\n\n";
    echo "  " . str_pad("Arquivo", 45) . str_pad("Status", 12) . "Executada em\n";
    echo "  " . str_repeat("─", 75) . "\n";

    foreach ($allFiles as $file) {
        $name = basename($file);
        $done = array_search($name, $ran);

        if ($done !== false) {
            $ranAt = $pdo->query("SELECT ran_at FROM migrations WHERE filename = " . $pdo->quote($name))
                         ->fetchColumn();
            $ranAt = date('d/m/Y H:i', strtotime($ranAt));
            echo "  " . str_pad($name, 45) . "\e[32m" . str_pad("✅ rodada", 12) . "\e[0m" . $ranAt . "\n";
        } else {
            echo "  " . str_pad($name, 45) . "\e[33m" . str_pad("⏳ pendente", 12) . "\e[0m—\n";
        }
    }

    echo "\n  Total: " . count($allFiles) . " migrations | "
       . count($ran) . " executadas | "
       . (count($allFiles) - count($ran)) . " pendentes\n\n";
}

// ── RESET ─────────────────────────────────────────────────────────────────────
elseif ($command === 'reset') {
    echo "\n  ⚠️  Revertendo TODAS as migrations...\n\n";

    $all = $pdo->query("SELECT filename FROM migrations ORDER BY id DESC")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($all as $name) {
        $file = dirname(__DIR__) . '/database/migrations/' . $name;
        if (!file_exists($file)) continue;

        try {
            $pdo->beginTransaction();
            $migration = require $file;
            $migration->down($pdo);
            $pdo->prepare("DELETE FROM migrations WHERE filename = ?")->execute([$name]);
            $pdo->commit();
            echo "  ↩️   {$name}\n";
        } catch (\Throwable $e) {
            $pdo->rollBack();
            echo "  ❌  {$name} - ERRO: {$e->getMessage()}\n";
            exit(1);
        }
    }

    echo "\n  Reset completo. Banco limpo. 🗑️\n\n";
}

// ── COMANDO INVÁLIDO ──────────────────────────────────────────────────────────
else {
    echo "\n  Uso: php bin/migrate.php [comando] [passos]\n\n";
    echo "  Comandos disponíveis:\n";
    echo "    up              Roda todas as migrations pendentes\n";
    echo "    rollback [N]    Reverte as últimas N migrations (padrão: 1)\n";
    echo "    status          Lista o estado de todas as migrations\n";
    echo "    reset           Reverte TODAS as migrations\n\n";
    echo "  Para criar uma migration nova:\n";
    echo "    php bin/make-migration.php nome_da_migration\n\n";
    echo "  Exemplos:\n";
    echo "    php bin/migrate.php up\n";
    echo "    php bin/migrate.php rollback\n";
    echo "    php bin/migrate.php rollback 3\n";
    echo "    php bin/migrate.php status\n";
    echo "    php bin/migrate.php reset\n\n";
    echo "    php bin/make-migration.php create_budgets\n\n";
}
