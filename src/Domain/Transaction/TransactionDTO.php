<?php

declare(strict_types=1);

namespace App\Domain\Transaction;

use App\Domain\Shared\Money;

final class TransactionDTO
{
    public function __construct(
        public readonly int     $userId,
        public readonly int     $accountId,
        public readonly int     $categoryId,
        public readonly string  $type,
        public readonly Money   $amount,
        public readonly string  $description,
        public readonly string  $transactionDate,
        public readonly ?string $notes = null,
    ) {}

    public static function fromRequest(array $post, int $userId): self
    {
        return new self(
            userId:          $userId,
            accountId:       (int) ($post['account_id']  ?? 0),
            categoryId:      (int) ($post['category_id'] ?? 0),
            type:            $post['type']             ?? 'expense',
            amount:          Money::fromString($post['amount'] ?? '0'),
            description:     trim($post['description'] ?? ''),
            transactionDate: $post['transaction_date'] ?? date('Y-m-d'),
            notes:           !empty($post['notes']) ? trim($post['notes']) : null,
        );
    }

    // Atalho para salvar no banco
    public function amountCents(): int
    {
        return $this->amount->cents();
    }
}
