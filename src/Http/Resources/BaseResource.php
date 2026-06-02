<?php

declare(strict_types=1);

namespace App\Http\Resources;

abstract class BaseResource
{
    abstract public function toArray(): array;

    public function toJson(): string
    {
        return json_encode($this->toArray(), JSON_UNESCAPED_UNICODE);
    }

    /** Converte uma coleção de modelos em array de resources */
    public static function collection(array $items): array
    {
        return array_map(fn($item) => (new static($item))->toArray(), $items);
    }
}
