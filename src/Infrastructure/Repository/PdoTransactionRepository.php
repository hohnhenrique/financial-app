<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Domain\Transaction\Transaction;
use App\Domain\Transaction\TransactionDTO;
use App\Domain\Transaction\TransactionRepositoryInterface;
use App\Core\Log\Logger;

final class PdoTransactionRepository extends AbstractRepository implements TransactionRepositoryInterface
{
    private const BASE_SELECT = "
        SELECT
            t.*,
            c.name  AS category_name,
            c.color AS category_color,
            a.name  AS account_name
        FROM transactions t
        LEFT JOIN categories c ON c.id  = t.category_id
        LEFT JOIN accounts   a ON a.id  = t.account_id
    ";

    // ── Filtros e ordenação ───────────────────────────────────────────────────

    private function buildFilters(int $userId, array $filters): array
    {
        $where    = ['t.deleted_at IS NULL', 't.user_id = ?'];
        $bindings = [$userId];

        $map = [
            'type'        => ['t.type = ?',                     null],
            'category_id' => ['t.category_id = ?',              null],
            'account_id'  => ['t.account_id = ?',               null],
            'date_from'   => ['t.transaction_date >= ?',        null],
            'date_to'     => ['t.transaction_date <= ?',        null],
            'year_month'  => ["to_char(t.transaction_date,'YYYY-MM') = ?", null],
            'search'      => ['t.description ILIKE ?',          fn($v) => "%{$v}%"],
        ];

        foreach ($map as $key => [$clause, $transform]) {
            if (!empty($filters[$key])) {
                $where[]    = $clause;
                $bindings[] = $transform ? $transform($filters[$key]) : $filters[$key];
            }
        }

        // Valores monetários precisam conversão
        if (!empty($filters['amount_from'])) {
            $where[]    = 't.amount_cents >= ?';
            $bindings[] = (int) round((float) str_replace(',', '.', $filters['amount_from']) * 100);
        }
        if (!empty($filters['amount_to'])) {
            $where[]    = 't.amount_cents <= ?';
            $bindings[] = (int) round((float) str_replace(',', '.', $filters['amount_to']) * 100);
        }

        return [implode(' AND ', $where), $bindings];
    }

    private function buildOrder(array $filters): string
    {
        $column = match($filters['sort_by'] ?? 'date') {
            'amount'      => 't.amount_cents',
            'description' => 't.description',
            'category'    => 'c.name',
            default       => 't.transaction_date',
        };
        $dir = strtoupper($filters['sort_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        return "ORDER BY {$column} {$dir}, t.created_at DESC";
    }

    // ── Interface ─────────────────────────────────────────────────────────────

    public function findById(int $id, int $userId): ?Transaction
    {
        $row = $this->fetchOne(
            self::BASE_SELECT . ' WHERE t.id = ? AND t.user_id = ? AND t.deleted_at IS NULL',
            [$id, $userId]
        );
        return $row ? Transaction::fromArray($row) : null;
    }

    public function findByUser(int $userId, array $filters = []): array
    {
        [$where, $bindings] = $this->buildFilters($userId, $filters);
        $order              = $this->buildOrder($filters);
        return array_map(
            Transaction::fromArray(...),
            $this->fetchAll(self::BASE_SELECT . " WHERE {$where} {$order}", $bindings)
        );
    }

    public function findByUserPaginated(int $userId, int $page, int $perPage, array $filters = []): array
    {
        [$where, $bindings] = $this->buildFilters($userId, $filters);
        $order              = $this->buildOrder($filters);
        $offset             = ($page - 1) * $perPage;

        return array_map(
            Transaction::fromArray(...),
            $this->fetchAll(
                self::BASE_SELECT . " WHERE {$where} {$order} LIMIT {$perPage} OFFSET {$offset}",
                $bindings
            )
        );
    }

    public function countByUser(int $userId, array $filters = []): int
    {
        [$where, $bindings] = $this->buildFilters($userId, $filters);
        return (int) $this->fetchScalar(
            "SELECT COUNT(*) FROM transactions t WHERE {$where}",
            $bindings
        );
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
                to_char(transaction_date, 'YYYY-MM') AS month,
                to_char(transaction_date, 'Mon/YY')  AS label,
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expense,
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0)
                - COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS balance
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND transaction_date >= date_trunc('month', now()) - INTERVAL '11 months'
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

    public function reportByCategory(int $userId, array $filters): array
    {
        [$where, $bindings] = $this->buildFilters($userId, $filters);
        return $this->fetchAll("
            SELECT
                c.name  AS category_name,
                c.color AS category_color,
                t.type,
                SUM(t.amount_cents)   AS total,
                COUNT(*)              AS qty,
                MIN(t.amount_cents)   AS min_amount,
                MAX(t.amount_cents)   AS max_amount,
                AVG(t.amount_cents)   AS avg_amount
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE {$where}
            GROUP BY c.name, c.color, t.type
            ORDER BY total DESC
        ", $bindings);
    }

    public function save(TransactionDTO $dto): Transaction
    {
        $id = $this->table('transactions')->insert([
            'user_id'          => $dto->userId,
            'account_id'       => $dto->accountId,
            'category_id'      => $dto->categoryId,
            'type'             => $dto->type,
            'amount_cents'     => $dto->amountCents(),
            'description'      => $dto->description,
            'notes'            => $dto->notes,
            'transaction_date' => $dto->transactionDate,
        ]);

        Logger::info('Transaction created', ['id' => $id, 'user' => $dto->userId, 'amount' => $dto->amountCents()]);

        return $this->findById((int) $id, $dto->userId);
    }

    public function update(int $id, int $userId, TransactionDTO $dto): Transaction
    {
        $this->table('transactions')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->whereNull('deleted_at')
            ->update([
                'account_id'       => $dto->accountId,
                'category_id'      => $dto->categoryId,
                'type'             => $dto->type,
                'amount_cents'     => $dto->amountCents(),
                'description'      => $dto->description,
                'notes'            => $dto->notes,
                'transaction_date' => $dto->transactionDate,
                'updated_at'       => date('Y-m-d H:i:s'),
            ]);

        Logger::info('Transaction updated', ['id' => $id, 'user' => $userId]);

        return $this->findById($id, $userId);
    }

    public function delete(int $id, int $userId): bool
    {
        $affected = $this->table('transactions')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->softDelete();

        if ($affected > 0) {
            Logger::info('Transaction deleted', ['id' => $id, 'user' => $userId]);
        }

        return $affected > 0;
    }
}
