<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
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
        $userId  = $this->userId();
        $page    = max(1, (int) ($_GET['page']     ?? 1));
        $perPage = in_array((int)($_GET['per_page'] ?? 10), [10,25,50,100]) ? (int)$_GET['per_page'] : 10;
        $sortBy  = $_GET['sort_by']  ?? 'created_at';
        $sortDir = strtoupper($_GET['sort_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $all = $this->service->listByUser($userId);

        // Busca saldo real de todas as contas em uma query só
        $pdo  = Connection::get();
        $stmt = $pdo->prepare("
            SELECT
                account_id,
                SUM(CASE WHEN type = 'income'  THEN amount_cents ELSE 0 END) AS total_income,
                SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS total_expense
            FROM transactions
            WHERE deleted_at IS NULL AND user_id = ?
            GROUP BY account_id
        ");
        $stmt->execute([$userId]);
        $balances = [];
        foreach ($stmt->fetchAll() as $row) {
            $balances[$row['account_id']] = (int)$row['total_income'] - (int)$row['total_expense'];
        }

        // Serializa com saldo real
        $serialized = array_map(fn($a) => $this->serializeAccount($a, $balances), $all);

        // Ordena
        usort($serialized, function($a, $b) use ($sortBy, $sortDir) {
            $va = $a[$sortBy] ?? $a['created_at'];
            $vb = $b[$sortBy] ?? $b['created_at'];
            $cmp = is_string($va) ? strcmp($va, $vb) : ($va <=> $vb);
            return $sortDir === 'DESC' ? -$cmp : $cmp;
        });

        $total  = count($serialized);
        $offset = ($page - 1) * $perPage;
        $items  = array_slice($serialized, $offset, $perPage);

        return $this->success([
            'items'       => $items,
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
            return $this->success($this->serializeAccount($this->service->findById((int)$id, $this->userId()), []));
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function store(): string
    {
        $this->requireAuth();
        try {
            $a = $this->service->create(AccountDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serializeAccount($a, []), 'Conta cadastrada.', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage());
        }
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        try {
            $a = $this->service->update((int)$id, $this->userId(), AccountDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serializeAccount($a, []), 'Conta atualizada.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        try {
            $this->service->delete((int)$id, $this->userId());
            return $this->success(null, 'Conta excluída.');
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    private function serializeAccount(\App\Domain\Account\Account $a, array $balances): array
    {
        $txBalance  = $balances[$a->id] ?? 0;
        $realBalance = $a->initialBalanceCents + $txBalance;
        return [
            'id'                    => $a->id,
            'name'                  => $a->name,
            'type'                  => $a->type,
            'currency'              => $a->currency,
            'initial_balance_cents' => $a->initialBalanceCents,
            'real_balance_cents'    => $realBalance,
            'color'                 => $a->color,
            'is_hidden'             => $a->isHidden,
            'created_at'            => $a->createdAt,
        ];
    }
}
