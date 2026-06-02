<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Account\Account;

final class AccountResource extends BaseResource
{
    public function __construct(
        private readonly Account $account,
        private readonly int     $realBalanceCents = 0,
    ) {}

    public function toArray(): array
    {
        $a = $this->account;
        return [
            'id'                    => $a->id,
            'name'                  => $a->name,
            'type'                  => $a->type,
            'currency'              => $a->currency,
            'initial_balance_cents' => $a->initialBalanceCents,
            'real_balance_cents'    => $this->realBalanceCents,
            'color'                 => $a->color,
            'is_hidden'             => $a->isHidden,
            'created_at'            => $a->createdAt,
        ];
    }
}
