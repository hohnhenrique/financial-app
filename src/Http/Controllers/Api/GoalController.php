<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
use App\Domain\Shared\Money;

final class GoalController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();

        $rows = Connection::get()
            ->prepare('SELECT * FROM monthly_goals WHERE user_id = ? ORDER BY year_month DESC')
            ->execute([$this->userId()]) && false; // trick: use fetchAll below

        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM monthly_goals WHERE user_id = ? ORDER BY year_month DESC');
        $stmt->execute([$this->userId()]);

        return $this->success($stmt->fetchAll());
    }

    public function forMonth(string $yearMonth): string
    {
        $this->requireAuth();

        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM monthly_goals WHERE user_id = ? AND year_month = ?');
        $stmt->execute([$this->userId(), $yearMonth]);
        $goal = $stmt->fetch();

        // Busca o realizado do mês
        $realStmt = $pdo->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS total_expense
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND to_char(transaction_date, 'YYYY-MM') = ?
        ");
        $realStmt->execute([$this->userId(), $yearMonth]);
        $real = $realStmt->fetch();

        $incomeGoal  = (int) ($goal['income_goal']  ?? 0);
        $expenseGoal = (int) ($goal['expense_goal'] ?? 0);
        $realIncome  = (int) ($real['total_income']  ?? 0);
        $realExpense = (int) ($real['total_expense'] ?? 0);

        return $this->success([
            'goal'         => $goal ?: null,
            'year_month'   => $yearMonth,
            'income_goal'  => $incomeGoal,
            'expense_goal' => $expenseGoal,
            'real_income'  => $realIncome,
            'real_expense' => $realExpense,
            'projected_balance' => $incomeGoal - $expenseGoal,
            'real_balance'      => $realIncome - $realExpense,
            'income_pct'   => $incomeGoal  > 0 ? round($realIncome  / $incomeGoal  * 100) : null,
            'expense_pct'  => $expenseGoal > 0 ? round($realExpense / $expenseGoal * 100) : null,
        ]);
    }

    public function upsert(): string
    {
        $this->requireAuth();

        $body        = $this->body();
        $yearMonth   = trim($body['year_month']   ?? '');
        $incomeGoal  = Money::fromString($body['income_goal']  ?? '0')->cents();
        $expenseGoal = Money::fromString($body['expense_goal'] ?? '0')->cents();
        $notes       = trim($body['notes'] ?? '');

        if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            return $this->error('Mês inválido. Use o formato AAAA-MM.');
        }

        $pdo = Connection::get();

        $existing = $pdo->prepare('SELECT id FROM monthly_goals WHERE user_id = ? AND year_month = ?');
        $existing->execute([$this->userId(), $yearMonth]);

        if ($existing->fetch()) {
            $pdo->prepare("
                UPDATE monthly_goals
                SET income_goal = ?, expense_goal = ?, notes = ?, updated_at = now()
                WHERE user_id = ? AND year_month = ?
            ")->execute([$incomeGoal, $expenseGoal, $notes ?: null, $this->userId(), $yearMonth]);
        } else {
            $pdo->prepare("
                INSERT INTO monthly_goals (user_id, year_month, income_goal, expense_goal, notes)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([$this->userId(), $yearMonth, $incomeGoal, $expenseGoal, $notes ?: null]);
        }

        return $this->success(null, 'Meta salva com sucesso.');
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        Connection::get()
            ->prepare('DELETE FROM monthly_goals WHERE id = ? AND user_id = ?')
            ->execute([$id, $this->userId()]);
        return $this->success(null, 'Meta removida.');
    }
}
