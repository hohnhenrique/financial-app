<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;

final class NotificationController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();
        $userId    = $this->userId();
        $pdo       = Connection::get();
        $yearMonth = date('Y-m');
        $notifications = [];

        // 1. Meta de despesa em 80%+
        $stmt = $pdo->prepare("
            SELECT mg.expense_goal, mg.year_month,
                   COALESCE(SUM(t.amount_cents),0) AS real_expense
            FROM monthly_goals mg
            LEFT JOIN transactions t ON t.user_id = mg.user_id
                AND t.type = 'expense' AND t.deleted_at IS NULL
                AND to_char(t.transaction_date,'YYYY-MM') = mg.year_month
            WHERE mg.user_id = ? AND mg.year_month = ?
              AND mg.expense_goal > 0
            GROUP BY mg.expense_goal, mg.year_month
        ");
        $stmt->execute([$userId, $yearMonth]);
        $goal = $stmt->fetch();

        if ($goal) {
            $pct = round($goal['real_expense'] / $goal['expense_goal'] * 100);
            if ($pct >= 100) {
                $notifications[] = [
                    'id'      => 'goal-expense-over',
                    'type'    => 'error',
                    'title'   => 'Meta de despesa ultrapassada',
                    'message' => "Você gastou {$pct}% do limite de despesas deste mês.",
                    'icon'    => 'alert',
                ];
            } elseif ($pct >= 80) {
                $notifications[] = [
                    'id'      => 'goal-expense-80',
                    'type'    => 'warning',
                    'title'   => 'Atenção: despesas em {$pct}%',
                    'message' => "Você já utilizou {$pct}% do limite de despesas do mês.",
                    'icon'    => 'warning',
                ];
            }
        }

        // 2. Meta de receita não atingida no mês passado
        $lastMonth = date('Y-m', strtotime('first day of last month'));
        $stmt2 = $pdo->prepare("
            SELECT mg.income_goal,
                   COALESCE(SUM(t.amount_cents),0) AS real_income
            FROM monthly_goals mg
            LEFT JOIN transactions t ON t.user_id = mg.user_id
                AND t.type = 'income' AND t.deleted_at IS NULL
                AND to_char(t.transaction_date,'YYYY-MM') = mg.year_month
            WHERE mg.user_id = ? AND mg.year_month = ?
              AND mg.income_goal > 0
            GROUP BY mg.income_goal
        ");
        $stmt2->execute([$userId, $lastMonth]);
        $lastGoal = $stmt2->fetch();

        if ($lastGoal && $lastGoal['real_income'] < $lastGoal['income_goal']) {
            $pct = round($lastGoal['real_income'] / $lastGoal['income_goal'] * 100);
            $notifications[] = [
                'id'      => 'goal-income-missed',
                'type'    => 'info',
                'title'   => 'Meta de receita não atingida',
                'message' => "No mês passado você atingiu apenas {$pct}% da meta de receita.",
                'icon'    => 'info',
            ];
        }

        // 3. Sem movimentações nos últimos 7 dias
        $stmt3 = $pdo->prepare("
            SELECT COUNT(*) FROM transactions
            WHERE user_id = ? AND deleted_at IS NULL
              AND transaction_date >= now() - INTERVAL '7 days'
        ");
        $stmt3->execute([$userId]);
        $recentCount = (int) $stmt3->fetchColumn();

        if ($recentCount === 0) {
            $notifications[] = [
                'id'      => 'no-recent-tx',
                'type'    => 'info',
                'title'   => 'Nenhum lançamento recente',
                'message' => 'Você não registrou movimentações nos últimos 7 dias. Tudo em dia?',
                'icon'    => 'info',
            ];
        }

        // 4. Saldo negativo no mês
        $stmt4 = $pdo->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN type='income'  THEN amount_cents END),0) AS income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents END),0) AS expense
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
              AND to_char(transaction_date,'YYYY-MM') = ?
        ");
        $stmt4->execute([$userId, $yearMonth]);
        $summary = $stmt4->fetch();
        $balance = ($summary['income'] ?? 0) - ($summary['expense'] ?? 0);

        if ($balance < 0) {
            $notifications[] = [
                'id'      => 'negative-balance',
                'type'    => 'error',
                'title'   => 'Saldo negativo no mês',
                'message' => 'Suas despesas superaram as receitas este mês.',
                'icon'    => 'alert',
            ];
        }

        return $this->success([
            'count'         => count($notifications),
            'notifications' => $notifications,
        ]);
    }
}
