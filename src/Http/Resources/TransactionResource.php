<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Transaction\Transaction;

final class TransactionResource extends BaseResource
{
    public function __construct(
        private readonly Transaction $transaction,
    ) {}

    public function toArray(): array
    {
        $tx = $this->transaction;
        return [
            'id'               => $tx->id,
            'user_id'          => $tx->userId,
            'account_id'       => $tx->accountId,
            'category_id'      => $tx->categoryId,
            'type'             => $tx->type,
            'amount_cents'     => $tx->amountCents,
            'description'      => $tx->description,
            'notes'            => $tx->notes,
            'transaction_date' => $tx->transactionDate,
            'category_name'    => $tx->categoryName,
            'category_color'   => $tx->categoryColor ?? null,
            'account_name'     => $tx->accountName,
            'created_at'       => $tx->createdAt,
        ];
    }

    public static function collection(array $items): array
    {
        return array_map(
            fn(Transaction $tx) => (new self($tx))->toArray(),
            $items
        );
    }
}
