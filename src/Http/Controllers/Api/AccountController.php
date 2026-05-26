<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Account\AccountDTO;
use App\Domain\Account\AccountService;

final class AccountController extends ApiController
{
    public function __construct(
        private readonly AccountService $service,
        \App\Infrastructure\Session\RedisSession $session,
    ) {
        parent::__construct($session);
    }

    public function index(): string
    {
        $this->requireAuth();
        $accounts = $this->service->listByUser($this->userId());
        return $this->success(array_map(fn($a) => $this->serialize($a), $accounts));
    }

    public function show(string $id): string
    {
        $this->requireAuth();
        try {
            return $this->success($this->serialize($this->service->findById((int) $id, $this->userId())));
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function store(): string
    {
        $this->requireAuth();
        try {
            $account = $this->service->create(AccountDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serialize($account), 'Conta cadastrada.', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage());
        }
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        try {
            $account = $this->service->update((int) $id, $this->userId(), AccountDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serialize($account), 'Conta atualizada.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        try {
            $this->service->delete((int) $id, $this->userId());
            return $this->success(null, 'Conta excluída.');
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    private function serialize(\App\Domain\Account\Account $a): array
    {
        return [
            'id'                   => $a->id,
            'name'                 => $a->name,
            'type'                 => $a->type,
            'currency'             => $a->currency,
            'initial_balance_cents'=> $a->initialBalanceCents,
            'color'                => $a->color,
            'is_hidden'            => $a->isHidden,
            'created_at'           => $a->createdAt,
        ];
    }
}
