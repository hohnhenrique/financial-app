<?php

declare(strict_types=1);

namespace App\Domain\Transaction;

use App\Domain\Shared\Money;

final class TransactionService
{
    public function __construct(
        private readonly TransactionRepositoryInterface $repository,
    ) {}

    public function listByUser(int $userId): array
    {
        return $this->repository->findByUser($userId);
    }

    public function listPaginated(int $userId, int $page, int $perPage): array
    {
        return $this->repository->findByUserPaginated($userId, $page, $perPage);
    }

    public function countByUser(int $userId): int
    {
        return $this->repository->countByUser($userId);
    }

    public function findById(int $id, int $userId): Transaction
    {
        return $this->repository->findById($id, $userId)
            ?? throw new \RuntimeException('Movimentação não encontrada.');
    }

    public function monthlySummary(int $userId, string $yearMonth): array
    {
        return $this->repository->monthlySummary($userId, $yearMonth);
    }

    public function last6MonthsChart(int $userId): array
    {
        return $this->repository->last6MonthsChart($userId);
    }

    public function expensesByCategory(int $userId, string $yearMonth): array
    {
        return $this->repository->expensesByCategory($userId, $yearMonth);
    }

    public function create(TransactionDTO $dto): Transaction
    {
        $this->validate($dto);
        return $this->repository->save($dto);
    }

    public function update(int $id, int $userId, TransactionDTO $dto): Transaction
    {
        $this->validate($dto);
        return $this->repository->update($id, $userId, $dto);
    }

    public function delete(int $id, int $userId): bool
    {
        $this->findById($id, $userId);
        return $this->repository->delete($id, $userId);
    }

    public function calculateBalance(array $transactions): Money
    {
        $balance = Money::ofCents(0);

        foreach ($transactions as $tx) {
            $amount = Money::ofCents($tx->amountCents);
            $balance = $tx->isIncome()
                ? $balance->add($amount)
                : $balance->subtract($amount);
        }

        return $balance;
    }

    private function validate(TransactionDTO $dto): void
    {
        if ($dto->amount->isZero()) {
            throw new \InvalidArgumentException('O valor deve ser maior que zero.');
        }

        if (!in_array($dto->type, ['income', 'expense', 'transfer'], strict: true)) {
            throw new \InvalidArgumentException('Tipo de transação inválido.');
        }

        if (strlen($dto->description) < 3) {
            throw new \InvalidArgumentException('Descrição deve ter ao menos 3 caracteres.');
        }
    }
}
