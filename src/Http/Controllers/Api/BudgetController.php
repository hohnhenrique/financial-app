<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;
use App\Core\Database\Connection;

final class BudgetController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();
        $yearMonth = $_GET['year_month'] ?? date('Y-m');
        $pdo = Connection::get();

        // Orçamentos + gasto real do mês
        $rows = $pdo->prepare("
            SELECT
                cb.id, cb.category_id, cb.budget_cents, cb.year_month,
                c.name AS category_name, c.color AS category_color, c.type AS category_type,
                COALESCE((
                    SELECT SUM(t.amount_cents)
                    FROM transactions t
                    WHERE t.category_id = cb.category_id
                      AND t.user_id = cb.user_id
                      AND t.type = 'expense'
                      AND t.deleted_at IS NULL
                      AND to_char(t.transaction_date, 'YYYY-MM') = cb.year_month
                ), 0) AS spent_cents
            FROM category_budgets cb
            JOIN categories c ON c.id = cb.category_id
            WHERE cb.user_id = ? AND cb.year_month = ?
            ORDER BY c.name ASC
        ");
        $rows->execute([$this->userId(), $yearMonth]);

        return $this->success($rows->fetchAll());
    }

    public function upsert(): string
    {
        $this->requireAuth();
        $body       = $this->body();
        $categoryId = $body['category_id'] ?? '';
        $yearMonth  = $body['year_month']  ?? date('Y-m');
        $budget     = (int) round((float) str_replace(',', '.', $body['budget'] ?? '0') * 100);

        if (!$categoryId) return $this->error('Categoria obrigatória.');

        $pdo = Connection::get();

        if ($budget <= 0) {
            $pdo->prepare('DELETE FROM category_budgets WHERE user_id=? AND category_id=? AND year_month=?')
                ->execute([$this->userId(), $categoryId, $yearMonth]);
            return $this->success(null, 'Orçamento removido.');
        }

        $exists = $pdo->prepare('SELECT id FROM category_budgets WHERE user_id=? AND category_id=? AND year_month=?');
        $exists->execute([$this->userId(), $categoryId, $yearMonth]);

        if ($exists->fetch()) {
            $pdo->prepare('UPDATE category_budgets SET budget_cents=?, updated_at=now() WHERE user_id=? AND category_id=? AND year_month=?')
                ->execute([$budget, $this->userId(), $categoryId, $yearMonth]);
        } else {
            $pdo->prepare('INSERT INTO category_budgets (user_id, category_id, year_month, budget_cents) VALUES (?,?,?,?)')
                ->execute([$this->userId(), $categoryId, $yearMonth, $budget]);
        }

        return $this->success(null, 'Orçamento salvo.');
    }
}
