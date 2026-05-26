<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Domain\Category\Category;
use App\Domain\Category\CategoryDTO;
use App\Domain\Category\CategoryRepositoryInterface;

final class PdoCategoryRepository extends AbstractRepository implements CategoryRepositoryInterface
{
    public function findByUser(int $userId): array
    {
        $rows = $this->fetchAll("
            SELECT * FROM categories
            WHERE user_id IS NULL OR user_id = ?
            ORDER BY user_id NULLS FIRST, name
        ", [$userId]);
        return array_map(Category::fromArray(...), $rows);
    }

    public function findById(int $id, int $userId): ?Category
    {
        $row = $this->fetchOne(
            'SELECT * FROM categories WHERE id = ? AND user_id = ?',
            [$id, $userId]
        );
        return $row ? Category::fromArray($row) : null;
    }

    public function save(CategoryDTO $dto): Category
    {
        $id = $this->insertReturningId("
            INSERT INTO categories (user_id, name, type, color, icon)
            VALUES (:user_id, :name, :type, :color, :icon)
            RETURNING id
        ", [
            'user_id' => $dto->userId,
            'name'    => $dto->name,
            'type'    => $dto->type,
            'color'   => $dto->color,
            'icon'    => $dto->icon,
        ]);

        return $this->findById((int) $id, $dto->userId);
    }

    public function update(int $id, int $userId, CategoryDTO $dto): Category
    {
        $this->query("
            UPDATE categories SET name = :name, type = :type, color = :color, icon = :icon
            WHERE id = :id AND user_id = :user_id
        ", [
            'name'    => $dto->name,
            'type'    => $dto->type,
            'color'   => $dto->color,
            'icon'    => $dto->icon,
            'id'      => $id,
            'user_id' => $userId,
        ]);
        return $this->findById($id, $userId);
    }

    public function delete(int $id, int $userId): bool
    {
        $this->query(
            'DELETE FROM categories WHERE id = ? AND user_id = ?',
            [$id, $userId]
        );
        return true;
    }
}
