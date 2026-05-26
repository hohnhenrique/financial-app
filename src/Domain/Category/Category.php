<?php

declare(strict_types=1);

namespace App\Domain\Category;

final class Category
{
    public function __construct(
        public readonly int     $id,
        public readonly ?int    $userId,
        public readonly string  $name,
        public readonly string  $type,
        public readonly string  $color,
        public readonly string  $icon,
        public readonly bool    $isArchived,
        public readonly ?string $createdAt = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id:         (int) $data['id'],
            userId:     isset($data['user_id']) ? (int) $data['user_id'] : null,
            name:       $data['name'],
            type:       $data['type'],
            color:      $data['color']       ?? '#1B4F8A',
            icon:       $data['icon']        ?? 'circle',
            isArchived: (bool) $data['is_archived'],
            createdAt:  $data['created_at']  ?? null,
        );
    }

    public function isGlobal(): bool { return $this->userId === null; }
}
