<?php

declare(strict_types=1);

namespace App\Domain\Account;

interface AccountRepositoryInterface
{
    /** @return Account[] */
    public function findByUser(string $userId): array;

    public function findById(string $id, string $userId): ?Account;

    public function save(AccountDTO $dto): Account;

    public function update(string $id, string $userId, AccountDTO $dto): Account;

    public function delete(string $id, string $userId): bool;
}
