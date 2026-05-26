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

$pdo->exec("
    CREATE TABLE IF NOT EXISTS seeders (
        id       SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        ran_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
");

$command = $argv[1] ?? 'run';
$allFiles = glob(dirname(__DIR__) . '/database/seeders/*.php') ?: [];
sort($allFiles);

$ran = $pdo->query("SELECT filename FROM seeders ORDER BY id")
           ->fetchAll(PDO::FETCH_COLUMN);

if ($command === 'run') {
    $pending = array_filter($allFiles, fn($file) => !in_array(basename($file), $ran, true));

    if (empty($pending)) {
        echo "\n  Nenhum seeder pendente. Banco ja esta semeado.\n\n";
        exit(0);
    }

    echo "\n  Rodando seeders...\n\n";

    foreach ($pending as $file) {
        $name = basename($file);

        try {
            $pdo->beginTransaction();
            $seeder = require $file;
            $seeder->run($pdo);
            $pdo->prepare("INSERT INTO seeders (filename) VALUES (?)")->execute([$name]);
            $pdo->commit();
            echo "  OK  {$name}\n";
        } catch (Throwable $e) {
            $pdo->rollBack();
            echo "  ERRO  {$name}: {$e->getMessage()}\n";
            exit(1);
        }
    }

    echo "\n  Seeders concluidos com sucesso.\n\n";
}

elseif ($command === 'status') {
    echo "\n  Status dos seeders:\n\n";
    echo "  " . str_pad("Arquivo", 45) . str_pad("Status", 12) . "Executado em\n";
    echo "  " . str_repeat("-", 75) . "\n";

    foreach ($allFiles as $file) {
        $name = basename($file);
        $done = array_search($name, $ran, true);

        if ($done !== false) {
            $ranAt = $pdo->query("SELECT ran_at FROM seeders WHERE filename = " . $pdo->quote($name))
                         ->fetchColumn();
            $ranAt = date('d/m/Y H:i', strtotime($ranAt));
            echo "  " . str_pad($name, 45) . str_pad("rodado", 12) . $ranAt . "\n";
        } else {
            echo "  " . str_pad($name, 45) . str_pad("pendente", 12) . "-\n";
        }
    }

    echo "\n  Total: " . count($allFiles) . " seeders | "
       . count($ran) . " executados | "
       . (count($allFiles) - count($ran)) . " pendentes\n\n";
}

elseif ($command === 'forget') {
    $pdo->exec("DELETE FROM seeders");
    echo "\n  Historico de seeders limpo. Os arquivos poderao ser executados novamente.\n\n";
}

else {
    echo "\n  Uso: php bin/seed.php [comando]\n\n";
    echo "  Comandos disponiveis:\n";
    echo "    run       Executa todos os seeders pendentes\n";
    echo "    status    Lista o estado de todos os seeders\n";
    echo "    forget    Limpa apenas o historico dos seeders executados\n\n";
    echo "  Para criar um seeder novo:\n";
    echo "    php bin/make-seeder.php nome_do_seeder\n\n";
    echo "  Exemplos:\n";
    echo "    php bin/seed.php run\n";
    echo "    php bin/seed.php status\n";
    echo "    php bin/make-seeder.php demo_user\n\n";
}
