<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$migrationDir = $root . '/database/migrations';
$name = trim(implode(' ', array_slice($argv, 1)));

if ($name === '') {
    echo "\n  Uso: php bin/make-migration.php nome_da_migration\n\n";
    echo "  Exemplos:\n";
    echo "    php bin/make-migration.php create_budgets\n";
    echo "    php bin/make-migration.php add due date to transactions\n\n";
    exit(1);
}

if (!is_dir($migrationDir)) {
    echo "\n  Diretorio de migrations nao encontrado: {$migrationDir}\n\n";
    exit(1);
}

$slug = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
$slug = $slug === false ? $name : $slug;
$slug = strtolower($slug);
$slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';
$slug = trim($slug, '_');

if ($slug === '') {
    echo "\n  Nome da migration invalido.\n\n";
    exit(1);
}

$timestamp = date('Y_m_d_His');
$filename = "{$timestamp}_{$slug}.php";
$path = $migrationDir . '/' . $filename;

if (file_exists($path)) {
    echo "\n  Migration ja existe: {$filename}\n\n";
    exit(1);
}

$template = <<<'PHP'
<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            -- Escreva aqui as alteracoes da migration.
        ");
    }

    public function down(PDO $pdo): void {
        $pdo->exec("
            -- Escreva aqui como desfazer a migration.
        ");
    }
};
PHP;

if (file_put_contents($path, $template . PHP_EOL) === false) {
    echo "\n  Nao foi possivel criar a migration em: {$path}\n\n";
    exit(1);
}

echo "\n  Migration criada: database/migrations/{$filename}\n\n";
