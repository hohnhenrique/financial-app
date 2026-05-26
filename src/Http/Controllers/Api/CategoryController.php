<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\Category\CategoryDTO;
use App\Domain\Category\CategoryService;

final class CategoryController extends ApiController
{
    public function __construct(
        private readonly CategoryService $service,
        \App\Infrastructure\Session\RedisSession $session,
    ) {
        parent::__construct($session);
    }

    public function index(): string
    {
        $this->requireAuth();
        $cats = $this->service->listByUser($this->userId());
        return $this->success(array_map(fn($c) => $this->serialize($c), $cats));
    }

    public function store(): string
    {
        $this->requireAuth();
        try {
            $cat = $this->service->create(CategoryDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serialize($cat), 'Categoria cadastrada.', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage());
        }
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        try {
            $cat = $this->service->update((int) $id, $this->userId(), CategoryDTO::fromRequest($this->body(), $this->userId()));
            return $this->success($this->serialize($cat), 'Categoria atualizada.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        try {
            $this->service->delete((int) $id, $this->userId());
            return $this->success(null, 'Categoria excluída.');
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 400);
        }
    }

    private function serialize(\App\Domain\Category\Category $c): array
    {
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
