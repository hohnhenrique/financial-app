<?php

require_once dirname(__DIR__) . '/vendor/autoload.php';

// Carrega .env de teste se existir, senão usa o principal
$envFile = file_exists(dirname(__DIR__) . '/.env.testing')
    ? dirname(__DIR__) . '/.env.testing'
    : dirname(__DIR__) . '/.env';

\App\Core\Env::load($envFile);
