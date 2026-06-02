<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Env;

Env::load(dirname(__DIR__) . '/.env');

$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=%s',
        $_ENV['DB_HOST'], $_ENV['DB_PORT'] ?? 5432, $_ENV['DB_NAME']),
    $_ENV['DB_USER'], $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Tabela de controle com checksum
$pdo->exec("
    CREATE TABLE IF NOT EXISTS migrations (
        id          SERIAL PRIMARY KEY,
        version     VARCHAR(255) NOT NULL UNIQUE,
        checksum    CHAR(32)     NOT NULL,
        applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
");

$migrationsPath = dirname(__DIR__) . '/database/migrations';
$command        = $argv[1] ?? 'status';

// ── Funções auxiliares ────────────────────────────────────────────────────────

function getMigrationFiles(string $path): array
{
    $files = glob($path . '/*.php');
    sort($files);
    return $files;
}

function getApplied(PDO $pdo): array
{
    return $pdo->query("SELECT version, checksum FROM migrations ORDER BY version")
               ->fetchAll(PDO::FETCH_KEY_PAIR);
}

function fileChecksum(string $file): string
{
    return md5_file($file);
}

function loadMigration(string $file): object
{
    return require $file;
}

function colorize(string $text, string $color): string
{
    $colors = ['green' => "\033[32m", 'red' => "\033[31m", 'yellow' => "\033[33m", 'reset' => "\033[0m"];
    return ($colors[$color] ?? '') . $text . $colors['reset'];
}

// ── Comandos ──────────────────────────────────────────────────────────────────

match ($command) {
    'up'       => runUp($pdo, $migrationsPath, (int)($argv[2] ?? PHP_INT_MAX)),
    'down'     => runDown($pdo, $migrationsPath, (int)($argv[2] ?? 1)),
    'rollback' => runDown($pdo, $migrationsPath, (int)($argv[2] ?? 1)),
    'reset'    => runReset($pdo, $migrationsPath),
    'status'   => runStatus($pdo, $migrationsPath),
    'fresh'    => runFresh($pdo, $migrationsPath),
    default    => showHelp(),
};

// ── UP ────────────────────────────────────────────────────────────────────────
function runUp(PDO $pdo, string $path, int $steps): void
{
    $files   = getMigrationFiles($path);
    $applied = getApplied($pdo);
    $ran     = 0;

    foreach ($files as $file) {
        if ($ran >= $steps) break;

        $version  = basename($file, '.php');
        $checksum = fileChecksum($file);

        // Detecta migration modificada após aplicada
        if (isset($applied[$version])) {
            if ($applied[$version] !== $checksum) {
                echo colorize("⚠ AVISO: {$version} foi modificada após ser aplicada! Checksum diverge.", 'yellow') . "\n";
                echo "   Esperado: {$applied[$version]}\n";
                echo "   Atual:    {$checksum}\n";
            }
            continue;
        }

        echo "Aplicando {$version}... ";

        try {
            $migration = loadMigration($file);
            $pdo->beginTransaction();
            $migration->up($pdo);

            $stmt = $pdo->prepare("INSERT INTO migrations (version, checksum) VALUES (?, ?)");
            $stmt->execute([$version, $checksum]);
            $pdo->commit();

            echo colorize("✓", 'green') . "\n";
            $ran++;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            echo colorize("✗ ERRO: " . $e->getMessage(), 'red') . "\n";
            exit(1);
        }
    }

    if ($ran === 0) echo colorize("Nenhuma migration pendente.", 'green') . "\n";
    else echo colorize("{$ran} migration(s) aplicada(s).", 'green') . "\n";
}

// ── DOWN ──────────────────────────────────────────────────────────────────────
function runDown(PDO $pdo, string $path, int $steps): void
{
    $applied = array_keys(getApplied($pdo));
    $toRun   = array_reverse(array_slice(array_reverse($applied), 0, $steps));
    $files   = array_combine(
        array_map(fn($f) => basename($f, '.php'), getMigrationFiles($path)),
        getMigrationFiles($path)
    );

    foreach ($toRun as $version) {
        if (!isset($files[$version])) {
            echo colorize("Arquivo não encontrado para rollback: {$version}", 'red') . "\n";
            continue;
        }

        echo "Revertendo {$version}... ";
        try {
            $migration = loadMigration($files[$version]);
            $pdo->beginTransaction();

            if (!method_exists($migration, 'down')) {
                throw new \RuntimeException("Método down() não implementado em {$version}");
            }

            $migration->down($pdo);
            $pdo->prepare("DELETE FROM migrations WHERE version = ?")->execute([$version]);
            $pdo->commit();

            echo colorize("✓", 'green') . "\n";
        } catch (\Throwable $e) {
            $pdo->rollBack();
            echo colorize("✗ ERRO: " . $e->getMessage(), 'red') . "\n";
            exit(1);
        }
    }
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function runReset(PDO $pdo, string $path): void
{
    $applied = count(getApplied($pdo));
    echo "Revertendo {$applied} migration(s)...\n";
    runDown($pdo, $path, $applied);
}

// ── FRESH ─────────────────────────────────────────────────────────────────────
function runFresh(PDO $pdo, string $path): void
{
    echo colorize("⚠ Isso irá DESTRUIR todos os dados. Confirme (yes): ", 'red');
    $confirm = trim(fgets(STDIN));
    if ($confirm !== 'yes') { echo "Cancelado.\n"; exit(0); }

    runReset($pdo, $path);
    runUp($pdo, $path, PHP_INT_MAX);
}

// ── STATUS ────────────────────────────────────────────────────────────────────
function runStatus(PDO $pdo, string $path): void
{
    $files   = getMigrationFiles($path);
    $applied = getApplied($pdo);

    echo "\n";
    printf("%-50s %-10s %-10s\n", 'Migration', 'Status', 'Checksum');
    echo str_repeat('-', 76) . "\n";

    foreach ($files as $file) {
        $version  = basename($file, '.php');
        $checksum = fileChecksum($file);

        if (!isset($applied[$version])) {
            printf("%-50s %-10s\n", $version, colorize('pendente', 'yellow'));
        } elseif ($applied[$version] !== $checksum) {
            printf("%-50s %-10s %-10s\n", $version, colorize('modificada!', 'red'), "✗ checksum diverge");
        } else {
            printf("%-50s %-10s\n", $version, colorize('aplicada', 'green'));
        }
    }

    echo "\n";
    $pending = count(array_filter($files, fn($f) => !isset($applied[basename($f, '.php')])));
    echo $pending > 0
        ? colorize("{$pending} migration(s) pendente(s).", 'yellow') . "\n\n"
        : colorize("Banco atualizado.", 'green') . "\n\n";
}

// ── HELP ──────────────────────────────────────────────────────────────────────
function showHelp(): void
{
    echo "\nUso: php bin/migrate.php [comando] [opções]\n\n";
    echo "Comandos:\n";
    echo "  status          Lista migrations e seus status (com detecção de checksum)\n";
    echo "  up [n]          Aplica as próximas N migrations (padrão: todas)\n";
    echo "  down [n]        Reverte as últimas N migrations (padrão: 1)\n";
    echo "  rollback [n]    Alias para down\n";
    echo "  reset           Reverte todas as migrations\n";
    echo "  fresh           Reset + Up (DESTRÓI DADOS — pede confirmação)\n\n";
}
