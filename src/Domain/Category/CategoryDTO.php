<?php

declare(strict_types=1);

namespace App\Domain\Category;

final class CategoryDTO
{
    public function __construct(
        public readonly int    $userId,
        public readonly string $name,
        public readonly string $type,
        public readonly string $color,
        public readonly string $icon,
    ) {}

    public static function fromRequest(array $post, int $userId): self
    {
        return new self(
            userId: $userId,
            name:   trim($post['name']  ?? ''),
            type:   $post['type']        ?? 'both',
            color:  $post['color']       ?? '#1B4F8A',
            icon:   $post['icon']        ?? 'circle',
        );
    }
}
