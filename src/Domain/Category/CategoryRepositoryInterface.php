<?php

declare(strict_types=1);

namespace App\Domain\Category;

interface CategoryRepositoryInterface
{
    /** @return Category[] */
    public function findByUser(int $userId): array;

    public function findById(int $id, int $userId): ?Category;

    public function save(CategoryDTO $dto): Category;

    public function update(int $id, int $userId, CategoryDTO $dto): Category;

    public function delete(int $id, int $userId): bool;
}
