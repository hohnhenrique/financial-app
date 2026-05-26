<?php

declare(strict_types=1);

namespace App\Domain\Import;

final class ImportedTransaction
{
    public function __construct(
        public readonly string  $date,
        public readonly string  $description,
        public readonly int     $amountCents,
        public readonly string  $type,           // 'income' | 'expense'
        public readonly string  $originalCategory = '',
        public readonly array   $raw             = [],
    ) {}

    public function toArray(): array
    {
        return [
            'date'              => $this->date,
            'description'       => $this->description,
            'amount_cents'      => $this->amountCents,
            'type'              => $this->type,
            'original_category' => $this->originalCategory,
        ];
    }
}
