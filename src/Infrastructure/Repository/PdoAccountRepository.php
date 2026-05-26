<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Domain\Account\Account;
use App\Domain\Account\AccountDTO;
use App\Domain\Account\AccountRepositoryInterface;

final class PdoAccountRepository extends AbstractRepository implements AccountRepositoryInterface
{
    public function findByUser(int $userId): array
    {
        $rows = $this->fetchAll(
            'SELECT * FROM accounts WHERE deleted_at IS NULL AND user_id = ? ORDER BY created_at DESC',
            [$userId]
        );
        return array_map(Account::fromArray(...), $rows);
    }

    public function findById(int $id, int $userId): ?Account
    {
        $row = $this->fetchOne(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
            [$id, $userId]
        );
        return $row ? Account::fromArray($row) : null;
    }

    public function save(AccountDTO $dto): Account
    {
        $id = $this->insertReturningId("
            INSERT INTO accounts (user_id, name, type, initial_balance_cents, color, is_hidden)
            VALUES (:user_id, :name, :type, :initial_balance_cents, :color, :is_hidden)
            RETURNING id
        ", [
            'user_id'               => $dto->userId,
            'name'                  => $dto->name,
            'type'                  => $dto->type,
            'initial_balance_cents' => $dto->initialBalanceCents,
            'color'                 => $dto->color,
            'is_hidden'             => $dto->isHidden ? 'true' : 'false',
        ]);

        return $this->findById((int) $id, $dto->userId);
    }

    public function update(int $id, int $userId, AccountDTO $dto): Account
    {
        $this->query("
            UPDATE accounts SET
                name                  = :name,
                type                  = :type,
                initial_balance_cents = :initial_balance_cents,
                color                 = :color,
                is_hidden             = :is_hidden
            WHERE id = :id AND user_id = :user_id AND deleted_at IS NULL
        ", [
            'name'                  => $dto->name,
            'type'                  => $dto->type,
            'initial_balance_cents' => $dto->initialBalanceCents,
            'color'                 => $dto->color,
            'is_hidden'             => $dto->isHidden ? 'true' : 'false',
            'id'                    => $id,
            'user_id'               => $userId,
        ]);

        return $this->findById($id, $userId);
    }

    public function delete(int $id, int $userId): bool
    {
        $this->query(
            'UPDATE accounts SET deleted_at = now() WHERE id = ? AND user_id = ?',
            [$id, $userId]
        );
        return true;
    }
}
