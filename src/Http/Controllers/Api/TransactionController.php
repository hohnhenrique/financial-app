<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Transaction\TransactionDTO;
use App\Domain\Transaction\TransactionService;

final class TransactionController extends ApiController
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
        $userId  = $this->userId();
        $page    = max(1, (int) ($_GET['page']     ?? 1));
        $perPage = (int) ($_GET['per_page'] ?? 10);
        $perPage = in_array($perPage, [10, 25, 50, 100]) ? $perPage : 10;

        $items = $this->service->listPaginated($userId, $page, $perPage);
        $total = $this->service->countByUser($userId);

        return $this->success([
            'items'      => array_map(fn($tx) => $this->serialize($tx), $items),
            'total'      => $total,
            'page'       => $page,
            'per_page'   => $perPage,
            'total_pages'=> (int) ceil($total / $perPage),
        ]);
    }

    public function show(string $id): string
    {
        $this->requireAuth();
        try {
            $tx = $this->service->findById((int) $id, $this->userId());
            return $this->success($this->serialize($tx));
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function store(): string
    {
        $this->requireAuth();
        try {
            $tx = $this->service->create(TransactionDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serialize($tx), 'Movimentação cadastrada.', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage());
        }
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        try {
            $tx = $this->service->update((int) $id, $this->userId(), TransactionDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serialize($tx), 'Movimentação atualizada.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        try {
            $this->service->delete((int) $id, $this->userId());
            return $this->success(null, 'Movimentação excluída.');
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    private function serialize(\App\Domain\Transaction\Transaction $tx): array
    {
        return [
            'id'               => $tx->id,
            'user_id'          => $tx->userId,
            'account_id'       => $tx->accountId,
            'category_id'      => $tx->categoryId,
            'type'             => $tx->type,
            'amount_cents'     => $tx->amountCents,
            'description'      => $tx->description,
            'notes'            => $tx->notes,
            'transaction_date' => $tx->transactionDate,
            'category_name'    => $tx->categoryName,
            'account_name'     => $tx->accountName,
            'created_at'       => $tx->createdAt,
        ];
    }
}
