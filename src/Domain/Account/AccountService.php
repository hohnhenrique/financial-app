<?php

declare(strict_types=1);

namespace App\Domain\Account;

final class AccountService
{
    public function __construct(
        private readonly AccountRepositoryInterface $repository,
    ) {}

    public function listByUser(int $userId): array
    {
        return $this->repository->findByUser($userId);
    }

    public function findById(int $id, int $userId): Account
    {
        return $this->repository->findById($id, $userId)
            ?? throw new \RuntimeException('Conta não encontrada.');
    }

    public function create(AccountDTO $dto): Account
    {
        $this->validate($dto);
        return $this->repository->save($dto);
    }

    public function update(int $id, int $userId, AccountDTO $dto): Account
    {
        $this->validate($dto);
        return $this->repository->update($id, $userId, $dto);
    }

    public function delete(int $id, int $userId): bool
    {
        $this->findById($id, $userId);
        return $this->repository->delete($id, $userId);
    }

    private function validate(AccountDTO $dto): void
    {
        if ($dto->name === '') {
            throw new \InvalidArgumentException('O nome da conta é obrigatório.');
        }
        if (!in_array($dto->type, ['checking','savings','wallet','investment','credit_card'], strict: true)) {
            throw new \InvalidArgumentException('Tipo de conta inválido.');
        }
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $dto->color)) {
            throw new \InvalidArgumentException('Cor inválida.');
        }
    }
}
