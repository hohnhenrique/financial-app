<?php

declare(strict_types=1);

namespace App\Domain\Account;

final class AccountDTO
{
    public function __construct(
        public readonly int    $userId,
        public readonly string $name,
        public readonly string $type,
        public readonly int    $initialBalanceCents,
        public readonly string $color,
        public readonly bool   $isHidden,
    ) {}

    public static function fromRequest(array $post, int $userId): self
    {
        $raw        = str_replace(['.', ','], ['', '.'], trim($post['initial_balance'] ?? '0'));
        $cents      = (int) round((float) $raw * 100);

        return new self(
            userId:              $userId,
            name:                trim($post['name']  ?? ''),
            type:                $post['type']        ?? 'checking',
            initialBalanceCents: $cents,
            color:               $post['color']       ?? '#1B4F8A',
            isHidden:            isset($post['is_hidden']),
        );
    }
}
