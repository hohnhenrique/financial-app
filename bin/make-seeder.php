<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$seederDir = $root . '/database/seeders';
$name = trim(implode(' ', array_slice($argv, 1)));

if ($name === '') {
    echo "\n  Uso: php bin/make-seeder.php nome_do_seeder\n\n";
    echo "  Exemplos:\n";
    echo "    php bin/make-seeder.php demo_user\n";
    echo "    php bin/make-seeder.php default categories\n\n";
    exit(1);
}

if (!is_dir($seederDir)) {
    echo "\n  Diretorio de seeders nao encontrado: {$seederDir}\n\n";
    exit(1);
}

$slug = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
$slug = $slug === false ? $name : $slug;
$slug = strtolower($slug);
$slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';
$slug = trim($slug, '_');

if ($slug === '') {
    echo "\n  Nome do seeder invalido.\n\n";
    exit(1);
}

$files = glob($seederDir . '/*.php') ?: [];
$lastNumber = 0;

foreach ($files as $file) {
    if (preg_match('/^(\d+)_.*\.php$/', basename($file), $matches)) {
        $lastNumber = max($lastNumber, (int) $matches[1]);
    }
}

$nextNumber = $lastNumber + 1;
$digits = max(3, strlen((string) $nextNumber));
$filename = str_pad((string) $nextNumber, $digits, '0', STR_PAD_LEFT) . "_{$slug}.php";
$path = $seederDir . '/' . $filename;

if (file_exists($path)) {
    echo "\n  Seeder ja existe: {$filename}\n\n";
    exit(1);
}

$template = <<<'PHP'
<?php
return new class {
    public function run(PDO $pdo): void {
        // Escreva aqui os dados iniciais que devem ser inseridos.
    }
};
PHP;

if (file_put_contents($path, $template . PHP_EOL) === false) {
    echo "\n  Nao foi possivel criar o seeder em: {$path}\n\n";
    exit(1);
}

echo "\n  Seeder criado: database/seeders/{$filename}\n\n";
