<?php

declare(strict_types=1);

namespace App\Domain\Category;

interface CategoryRepositoryInterface
{
    /** @return Category[] */
    public function findByUser(string $userId): array;

    public function findById(string $id, string $userId): ?Category;

    public function save(CategoryDTO $dto): Category;

    public function update(string $id, string $userId, CategoryDTO $dto): Category;

    public function delete(string $id, string $userId): bool;
}
