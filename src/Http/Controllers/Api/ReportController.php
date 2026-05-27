<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Transaction\TransactionService;

final class ReportController extends ApiController
{
    public function __construct(
        private readonly TransactionService $service,
        \App\Infrastructure\Session\RedisSession $session,
    ) {
        parent::__construct($session);
    }

    public function summary(): string
    {
        $this->requireAuth();
        $userId  = $this->userId();
        $filters = $this->queryFilters();

        $transactions  = $this->service->listByUser($userId, $filters);
        $byCategory    = $this->service->reportByCategory($userId, $filters);

        $totalIncome  = 0;
        $totalExpense = 0;
        foreach ($transactions as $tx) {
            if ($tx->isIncome())  $totalIncome  += $tx->amountCents;
            else                  $totalExpense += $tx->amountCents;
        }

        return $this->success([
            'filters'      => $filters,
            'total_income' => $totalIncome,
            'total_expense'=> $totalExpense,
            'balance'      => $totalIncome - $totalExpense,
            'count'        => count($transactions),
            'transactions' => array_map(fn($tx) => [
                'id'               => $tx->id,
                'type'             => $tx->type,
                'amount_cents'     => $tx->amountCents,
                'description'      => $tx->description,
                'transaction_date' => $tx->transactionDate,
                'category_name'    => $tx->categoryName,
                'category_color'   => $tx->categoryColor ?? '#64748b',
                'account_name'     => $tx->accountName,
            ], $transactions),
            'by_category' => $byCategory,
        ]);
    }

    private function queryFilters(): array
    {
        return array_filter([
            'type'        => $_GET['type']        ?? '',
            'category_id' => $_GET['category_id'] ?? '',
            'account_id'  => $_GET['account_id']  ?? '',
            'date_from'   => $_GET['date_from']   ?? '',
            'date_to'     => $_GET['date_to']     ?? '',
            'amount_from' => $_GET['amount_from'] ?? '',
            'amount_to'   => $_GET['amount_to']   ?? '',
            'year_month'  => $_GET['year_month']  ?? '',
            'sort_by'     => 'date',
            'sort_dir'    => 'ASC', // relatório: ordem cronológica
        ]);
    }
}
