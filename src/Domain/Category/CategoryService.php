<?php

declare(strict_types=1);

namespace App\Domain\Category;

final class CategoryService
{
    private const VALID_TYPES = ['income', 'expense', 'both'];
    private const VALID_ICONS = [
        'circle','wallet','briefcase','trending-up','home','car',
        'heart','book','tag','fork-knife','shirt','device-gamepad',
        'plus-circle','minus-circle',
    ];

    public function __construct(
        private readonly CategoryRepositoryInterface $repository,
    ) {}

    public function listByUser(int $userId): array
    {
        return $this->repository->findByUser($userId);
    }

    public function findById(int $id, int $userId): Category
    {
        return $this->repository->findById($id, $userId)
            ?? throw new \RuntimeException('Categoria não encontrada.');
    }

    public function create(CategoryDTO $dto): Category
    {
        $this->validate($dto);
        return $this->repository->save($dto);
    }

    public function update(int $id, int $userId, CategoryDTO $dto): Category
    {
        $this->validate($dto);
        return $this->repository->update($id, $userId, $dto);
    }

    public function delete(int $id, int $userId): bool
    {
        $cat = $this->findById($id, $userId);
        if ($cat->isGlobal()) {
            throw new \RuntimeException('Categorias padrão não podem ser excluídas.');
        }
        return $this->repository->delete($id, $userId);
    }

    private function validate(CategoryDTO $dto): void
    {
        if ($dto->name === '') throw new \InvalidArgumentException('Nome obrigatório.');
        if (!in_array($dto->type, self::VALID_TYPES, strict: true)) throw new \InvalidArgumentException('Tipo inválido.');
        if (!in_array($dto->icon, self::VALID_ICONS, strict: true)) throw new \InvalidArgumentException('Ícone inválido.');
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $dto->color)) throw new \InvalidArgumentException('Cor inválida.');
    }
}
