<?php

declare(strict_types=1);

namespace App\Domain\Transaction;

final class Transaction
{
    public function __construct(
        public readonly int     $id,
        public readonly int     $userId,
        public readonly int     $accountId,
        public readonly int     $categoryId,
        public readonly string  $type,
        public readonly int     $amountCents,
        public readonly string  $description,
        public readonly string  $transactionDate,
        public readonly ?string $notes        = null,
        public readonly ?string $categoryName = null,
        public readonly ?string $accountName  = null,
        public readonly ?string $createdAt    = null,
        public readonly ?string $deletedAt    = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id:              (int) $data['id'],
            userId:          (int) $data['user_id'],
            accountId:       (int) $data['account_id'],
            categoryId:      (int) $data['category_id'],
            type:            $data['type'],
            amountCents:     (int) $data['amount_cents'],
            description:     $data['description'],
            transactionDate: $data['transaction_date'],
            notes:           $data['notes']          ?? null,
            categoryName:    $data['category_name']  ?? null,
            accountName:     $data['account_name']   ?? null,
            createdAt:       $data['created_at']     ?? null,
            deletedAt:       $data['deleted_at']     ?? null,
        );
    }

    public function isIncome(): bool  { return $this->type === 'income'; }
    public function isExpense(): bool { return $this->type === 'expense'; }

    public function formattedAmount(): string
    {
        return 'R$ ' . number_format($this->amountCents / 100, 2, ',', '.');
    }
}
