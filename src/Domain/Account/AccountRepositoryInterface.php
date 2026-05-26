<?php

declare(strict_types=1);

namespace App\Domain\Account;

interface AccountRepositoryInterface
{
    /** @return Account[] */
    public function findByUser(int $userId): array;

    public function findById(int $id, int $userId): ?Account;

    public function save(AccountDTO $dto): Account;

    public function update(int $id, int $userId, AccountDTO $dto): Account;

    public function delete(int $id, int $userId): bool;
}
