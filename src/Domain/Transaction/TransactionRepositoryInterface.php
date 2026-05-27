<?php

declare(strict_types=1);

namespace App\Domain\Transaction;

interface TransactionRepositoryInterface
{
    public function findById(int $id, int $userId): ?Transaction;
    public function findByUser(int $userId, array $filters = []): array;
    public function findByUserPaginated(int $userId, int $page, int $perPage, array $filters = []): array;
    public function countByUser(int $userId, array $filters = []): int;
    public function monthlySummary(int $userId, string $yearMonth): array;
    public function last6MonthsChart(int $userId): array;
    public function expensesByCategory(int $userId, string $yearMonth): array;
    public function reportByCategory(int $userId, array $filters): array;
    public function save(TransactionDTO $dto): Transaction;
    public function update(int $id, int $userId, TransactionDTO $dto): Transaction;
    public function delete(int $id, int $userId): bool;
}
