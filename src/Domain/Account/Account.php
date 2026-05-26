<?php

declare(strict_types=1);

namespace App\Domain\Account;

final class Account
{
    public function __construct(
        public readonly int     $id,
        public readonly int     $userId,
        public readonly string  $name,
        public readonly string  $type,
        public readonly string  $currency,
        public readonly int     $initialBalanceCents,
        public readonly string  $color,
        public readonly bool    $isHidden,
        public readonly ?string $createdAt = null,
        public readonly ?string $deletedAt = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id:                  (int) $data['id'],
            userId:              (int) $data['user_id'],
            name:                $data['name'],
            type:                $data['type'],
            currency:            $data['currency'] ?? 'BRL',
            initialBalanceCents: (int) $data['initial_balance_cents'],
            color:               $data['color']     ?? '#1B4F8A',
            isHidden:            (bool) $data['is_hidden'],
            createdAt:           $data['created_at'] ?? null,
            deletedAt:           $data['deleted_at'] ?? null,
        );
    }

    public function formattedBalance(): string
    {
        return 'R$ ' . number_format($this->initialBalanceCents / 100, 2, ',', '.');
    }
}
