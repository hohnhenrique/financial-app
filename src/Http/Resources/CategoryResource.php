<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Category\Category;

final class CategoryResource extends BaseResource
{
    public function __construct(
        private readonly Category $category,
    ) {}

    public function toArray(): array
    {
        $c = $this->category;
        return [
            'id'          => $c->id,
            'user_id'     => $c->userId,
            'name'        => $c->name,
            'type'        => $c->type,
            'color'       => $c->color,
            'icon'        => $c->icon,
            'is_archived' => $c->isArchived,
            'is_global'   => $c->isGlobal(),
        ];
    }
}
