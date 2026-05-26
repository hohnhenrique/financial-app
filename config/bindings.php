<?php

declare(strict_types=1);

use App\Domain\Account\AccountRepositoryInterface;
use App\Domain\Category\CategoryRepositoryInterface;
use App\Domain\Transaction\TransactionRepositoryInterface;
use App\Infrastructure\Repository\PdoAccountRepository;
use App\Infrastructure\Repository\PdoCategoryRepository;
use App\Infrastructure\Repository\PdoTransactionRepository;

$container->bind(TransactionRepositoryInterface::class, PdoTransactionRepository::class);
$container->bind(AccountRepositoryInterface::class,     PdoAccountRepository::class);
$container->bind(CategoryRepositoryInterface::class,    PdoCategoryRepository::class);
