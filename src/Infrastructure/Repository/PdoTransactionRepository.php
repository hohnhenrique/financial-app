<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Domain\Transaction\Transaction;
use App\Domain\Transaction\TransactionDTO;
use App\Domain\Transaction\TransactionRepositoryInterface;

final class PdoTransactionRepository extends AbstractRepository implements TransactionRepositoryInterface
{
    private const BASE_SELECT = "
        SELECT t.*, c.name AS category_name, a.name AS account_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN accounts   a ON a.id = t.account_id
        WHERE t.deleted_at IS NULL AND t.user_id = ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
    ";

    public function findById(int $id, int $userId): ?Transaction
    {
        $row = $this->fetchOne(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
            [$id, $userId]
        );
        return $row ? Transaction::fromArray($row) : null;
    }

    public function findByUser(int $userId, array $filters = []): array
    {
        $rows = $this->fetchAll(self::BASE_SELECT, [$userId]);
        return array_map(Transaction::fromArray(...), $rows);
    }

    public function findByUserPaginated(int $userId, int $page, int $perPage): array
    {
        $rows = $this->paginate(self::BASE_SELECT, [$userId], $page, $perPage);
        return array_map(Transaction::fromArray(...), $rows);
    }

    public function countByUser(int $userId): int
    {
        return (int) $this->query(
            'SELECT COUNT(*) FROM transactions WHERE user_id = ? AND deleted_at IS NULL',
            [$userId]
        )->fetchColumn();
    }

    public function monthlySummary(int $userId, string $yearMonth): array
    {
        return $this->fetchOne("
            SELECT
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS total_expense
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND to_char(transaction_date, 'YYYY-MM') = ?
        ", [$userId, $yearMonth]) ?? ['total_income' => 0, 'total_expense' => 0];
    }

    public function last6MonthsChart(int $userId): array
    {
        return $this->fetchAll("
            SELECT
                to_char(transaction_date, 'YYYY-MM')                                       AS month,
                to_char(transaction_date, 'Mon/YY')                                        AS label,
                COALESCE(SUM(CASE WHEN type='income'  THEN amount_cents END), 0)           AS income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents END), 0)           AS expense,
                COALESCE(SUM(CASE WHEN type='income'  THEN amount_cents END), 0)
                - COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents END), 0)         AS balance
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND transaction_date >= date_trunc('month', now()) - INTERVAL '5 months'
            GROUP BY to_char(transaction_date, 'YYYY-MM'), to_char(transaction_date, 'Mon/YY')
            ORDER BY month ASC
        ", [$userId]);
    }

    public function expensesByCategory(int $userId, string $yearMonth): array
    {
        return $this->fetchAll("
            SELECT c.name, c.color, SUM(t.amount_cents) AS total
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.deleted_at IS NULL AND t.user_id = ?
              AND t.type = 'expense'
              AND to_char(t.transaction_date, 'YYYY-MM') = ?
            GROUP BY c.name, c.color
            ORDER BY total DESC
        ", [$userId, $yearMonth]);
    }

    public function save(TransactionDTO $dto): Transaction
    {
        $id = $this->insertReturningId("
            INSERT INTO transactions
                (user_id, account_id, category_id, type, amount_cents, description, notes, transaction_date)
            VALUES
                (:user_id, :account_id, :category_id, :type, :amount_cents, :description, :notes, :transaction_date)
            RETURNING id
        ", [
            'user_id'          => $dto->userId,
            'account_id'       => $dto->accountId,
            'category_id'      => $dto->categoryId,
            'type'             => $dto->type,
            'amount_cents'     => $dto->amountCents(),
            'description'      => $dto->description,
            'notes'            => $dto->notes,
            'transaction_date' => $dto->transactionDate,
        ]);
        return $this->findById((int) $id, $dto->userId);
    }

    public function update(int $id, int $userId, TransactionDTO $dto): Transaction
    {
        $this->query("
            UPDATE transactions SET
                account_id = :account_id, category_id = :category_id, type = :type,
                amount_cents = :amount_cents, description = :description,
                notes = :notes, transaction_date = :transaction_date, updated_at = now()
            WHERE id = :id AND user_id = :user_id AND deleted_at IS NULL
        ", [
            'account_id' => $dto->accountId, 'category_id' => $dto->categoryId,
            'type' => $dto->type, 'amount_cents' => $dto->amountCents(),
            'description' => $dto->description, 'notes' => $dto->notes,
            'transaction_date' => $dto->transactionDate, 'id' => $id, 'user_id' => $userId,
        ]);
        return $this->findById($id, $userId);
    }

    public function delete(int $id, int $userId): bool
    {
        $this->query('UPDATE transactions SET deleted_at = now() WHERE id = ? AND user_id = ?', [$id, $userId]);
        return true;
    }
}
