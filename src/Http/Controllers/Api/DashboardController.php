<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Transaction\TransactionService;

final class DashboardController extends ApiController
{
    public function __construct(
        private readonly TransactionService $service,
        \App\Infrastructure\Session\RedisSession $session,
    ) {
        parent::__construct($session);
    }

    public function index(): string
    {
        $this->requireAuth();

        $userId    = $this->userId();
        $yearMonth = $_GET['month'] ?? date('Y-m');

        return $this->success([
            'summary'             => $this->service->monthlySummary($userId, $yearMonth),
            'chart_months'        => $this->service->last6MonthsChart($userId),
            'expenses_by_category'=> $this->service->expensesByCategory($userId, $yearMonth),
            'recent_transactions' => array_map(
                fn($tx) => $this->serializeTransaction($tx),
                $this->service->listPaginated($userId, 1, 8)
            ),
        ]);
    }

    private function serializeTransaction(\App\Domain\Transaction\Transaction $tx): array
    {
        return [
            'id'               => $tx->id,
            'type'             => $tx->type,
            'amount_cents'     => $tx->amountCents,
            'description'      => $tx->description,
            'transaction_date' => $tx->transactionDate,
            'category_name'    => $tx->categoryName,
            'account_name'     => $tx->accountName,
        ];
    }
}
