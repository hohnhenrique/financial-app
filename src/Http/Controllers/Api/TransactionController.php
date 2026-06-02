<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Validation\Schema;
use App\Domain\Transaction\TransactionDTO;
use App\Domain\Transaction\TransactionService;
use App\Http\Resources\TransactionResource;
use App\Core\Log\Logger;

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
        $perPage = in_array((int)($_GET['per_page'] ?? 10), [10,25,50,100]) ? (int)$_GET['per_page'] : 10;

        $filters = array_filter([
            'type'        => $_GET['type']        ?? '',
            'category_id' => $_GET['category_id'] ?? '',
            'account_id'  => $_GET['account_id']  ?? '',
            'date_from'   => $_GET['date_from']   ?? '',
            'date_to'     => $_GET['date_to']     ?? '',
            'amount_from' => $_GET['amount_from'] ?? '',
            'amount_to'   => $_GET['amount_to']   ?? '',
            'search'      => $_GET['search']      ?? '',
            'sort_by'     => $_GET['sort_by']     ?? 'date',
            'sort_dir'    => $_GET['sort_dir']    ?? 'DESC',
        ]);

        $items = $this->service->listPaginated($userId, $page, $perPage, $filters);
        $total = $this->service->countByUser($userId, $filters);

        return $this->success([
            'items'       => TransactionResource::collection($items),
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int) ceil($total / $perPage),
        ]);
    }

    public function show(string $id): string
    {
        $this->requireAuth();
        try {
            $tx = $this->service->findById((int) $id, $this->userId());
            return $this->success((new TransactionResource($tx))->toArray());
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function store(): string
    {
        $this->requireAuth();
        try {
            Schema::assert([
                'type'             => Schema::enum(['income', 'expense'])->required(),
                'amount'           => Schema::string()->min(1)->required(),
                'transaction_date' => Schema::date()->required(),
                'category_id'      => Schema::string()->min(1)->required(),
                'account_id'       => Schema::string()->min(1)->required(),
                'description'      => Schema::string()->min(3)->max(255)->required(),
                'notes'            => Schema::string()->max(1000)->optional(),
            ], $this->body());

            $tx = $this->service->create(TransactionDTO::fromRequest($this->body(), $this->userId()));
            return $this->success((new TransactionResource($tx))->toArray(), 'Movimentação cadastrada.', 201);
        } catch (\InvalidArgumentException $e) {
            Logger::warning('Transaction validation failed', ['error' => $e->getMessage(), 'user' => $this->userId()]);
            return $this->error($e->getMessage());
        }
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        try {
            $tx = $this->service->update(
                (int) $id,
                $this->userId(),
                TransactionDTO::fromRequest($this->body(), $this->userId())
            );
            return $this->success((new TransactionResource($tx))->toArray(), 'Movimentação atualizada.');
        } catch (\Exception $e) {
            Logger::warning('Transaction update failed', ['id' => $id, 'error' => $e->getMessage()]);
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

    public function restore(string $id): string
    {
        $this->requireAuth();
        $this->query(
            'UPDATE transactions SET deleted_at = NULL WHERE id = ? AND user_id = ?',
            [$id, $this->userId()]
        );
        return $this->success(null, 'Movimentação restaurada.');
    }
}
