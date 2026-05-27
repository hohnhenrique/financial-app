<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Domain\Transaction\Transaction;
use App\Domain\Transaction\TransactionDTO;
use App\Domain\Transaction\TransactionRepositoryInterface;

final class PdoTransactionRepository extends AbstractRepository implements TransactionRepositoryInterface
{
    private const BASE_SELECT = "
        SELECT t.*, c.name AS category_name, c.color AS category_color,
               a.name AS account_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN accounts   a ON a.id = t.account_id
    ";

    // ── Filtros ───────────────────────────────────────────────────────────────
    private function buildWhere(int $userId, array $filters): array
    {
        $where    = ['t.deleted_at IS NULL', 't.user_id = ?'];
        $bindings = [$userId];

        if (!empty($filters['type'])) {
            $where[]    = 't.type = ?';
            $bindings[] = $filters['type'];
        }
        if (!empty($filters['category_id'])) {
            $where[]    = 't.category_id = ?';
            $bindings[] = $filters['category_id'];
        }
        if (!empty($filters['account_id'])) {
            $where[]    = 't.account_id = ?';
            $bindings[] = $filters['account_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[]    = 't.transaction_date >= ?';
            $bindings[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[]    = 't.transaction_date <= ?';
            $bindings[] = $filters['date_to'];
        }
        if (!empty($filters['amount_from'])) {
            $where[]    = 't.amount_cents >= ?';
            $bindings[] = (int) round((float) str_replace(',', '.', $filters['amount_from']) * 100);
        }
        if (!empty($filters['amount_to'])) {
            $where[]    = 't.amount_cents <= ?';
            $bindings[] = (int) round((float) str_replace(',', '.', $filters['amount_to']) * 100);
        }
        if (!empty($filters['search'])) {
            $where[]    = 't.description ILIKE ?';
            $bindings[] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['year_month'])) {
            $where[]    = "to_char(t.transaction_date, 'YYYY-MM') = ?";
            $bindings[] = $filters['year_month'];
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

        // Secundário sempre por created_at DESC para desempate
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
        [$where, $bindings] = $this->buildWhere($userId, $filters);
        $order = $this->buildOrder($filters);
        $rows  = $this->fetchAll(self::BASE_SELECT . " WHERE {$where} {$order}", $bindings);
        return array_map(Transaction::fromArray(...), $rows);
    }

    public function findByUserPaginated(int $userId, int $page, int $perPage, array $filters = []): array
    {
        [$where, $bindings] = $this->buildWhere($userId, $filters);
        $order  = $this->buildOrder($filters);
        $offset = ($page - 1) * $perPage;
        $rows   = $this->fetchAll(
            self::BASE_SELECT . " WHERE {$where} {$order} LIMIT {$perPage} OFFSET {$offset}",
            $bindings
        );
        return array_map(Transaction::fromArray(...), $rows);
    }

    public function countByUser(int $userId, array $filters = []): int
    {
        [$where, $bindings] = $this->buildWhere($userId, $filters);
        return (int) $this->query(
            "SELECT COUNT(*) FROM transactions t WHERE {$where}",
            $bindings
        )->fetchColumn();
    }

    public function monthlySummary(int $userId, string $yearMonth): array
    {
        return $this->fetchOne("
            SELECT
                COALESCE(SUM(CASE WHEN type='income'  THEN amount_cents END),0) AS total_income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents END),0) AS total_expense
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND to_char(transaction_date,'YYYY-MM') = ?
        ", [$userId, $yearMonth]) ?? ['total_income' => 0, 'total_expense' => 0];
    }

    public function last6MonthsChart(int $userId): array
    {
        return $this->fetchAll("
            SELECT
                to_char(transaction_date,'YYYY-MM')  AS month,
                to_char(transaction_date,'Mon/YY')   AS label,
                COALESCE(SUM(CASE WHEN type='income'  THEN amount_cents END),0) AS income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents END),0) AS expense,
                COALESCE(SUM(CASE WHEN type='income'  THEN amount_cents END),0)
                - COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents END),0) AS balance
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND transaction_date >= date_trunc('month', now()) - INTERVAL '11 months'
            GROUP BY to_char(transaction_date,'YYYY-MM'), to_char(transaction_date,'Mon/YY')
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
              AND to_char(t.transaction_date,'YYYY-MM') = ?
            GROUP BY c.name, c.color ORDER BY total DESC
        ", [$userId, $yearMonth]);
    }

    // Para relatórios
    public function reportByCategory(int $userId, array $filters): array
    {
        [$where, $bindings] = $this->buildWhere($userId, $filters);
        return $this->fetchAll("
            SELECT
                c.name AS category_name,
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
        $id = $this->insertReturningId("
            INSERT INTO transactions
                (user_id,account_id,category_id,type,amount_cents,description,notes,transaction_date)
            VALUES
                (:user_id,:account_id,:category_id,:type,:amount_cents,:description,:notes,:transaction_date)
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
                account_id=:account_id, category_id=:category_id, type=:type,
                amount_cents=:amount_cents, description=:description,
                notes=:notes, transaction_date=:transaction_date, updated_at=now()
            WHERE id=:id AND user_id=:user_id AND deleted_at IS NULL
        ", [
            'account_id'       => $dto->accountId,
            'category_id'      => $dto->categoryId,
            'type'             => $dto->type,
            'amount_cents'     => $dto->amountCents(),
            'description'      => $dto->description,
            'notes'            => $dto->notes,
            'transaction_date' => $dto->transactionDate,
            'id'               => $id,
            'user_id'          => $userId,
        ]);
        return $this->findById($id, $userId);
    }

    public function delete(int $id, int $userId): bool
    {
        $this->query('UPDATE transactions SET deleted_at=now() WHERE id=? AND user_id=?', [$id, $userId]);
        return true;
    }
}
