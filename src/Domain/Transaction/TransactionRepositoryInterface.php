<?php

declare(strict_types=1);

namespace App\Domain\Transaction;

interface TransactionRepositoryInterface
{
    public function findById(string $id, string $userId): ?Transaction;
    public function findByUser(string $userId, array $filters = []): array;
    public function findByUserPaginated(string $userId, int $page, int $perPage, array $filters = []): array;
    public function countByUser(string $userId, array $filters = []): int;
    public function monthlySummary(string $userId, string $yearMonth): array;
    public function last6MonthsChart(string $userId): array;
    public function expensesByCategory(string $userId, string $yearMonth): array;
    public function reportByCategory(string $userId, array $filters): array;
    public function save(TransactionDTO $dto): Transaction;
    public function update(string $id, string $userId, TransactionDTO $dto): Transaction;
    public function delete(string $id, string $userId): bool;
}
