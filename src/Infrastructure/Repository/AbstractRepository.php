<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Core\Log\Logger;

abstract class AbstractRepository
{
    public function __construct(
        protected readonly \PDO $pdo,
    ) {}

    // ── Execução ──────────────────────────────────────────────────────────────

    protected function query(string $sql, array $bindings = []): \PDOStatement
    {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($bindings);
            return $stmt;
        } catch (\PDOException $e) {
            Logger::error('Query falhou', [
                'sql'      => $this->normalizeSql($sql),
                'bindings' => $this->sanitizeBindings($bindings),
                'error'    => $e->getMessage(),
                'code'     => $e->getCode(),
            ]);
            throw $e;
        }
    }

    // ── Fetch helpers ─────────────────────────────────────────────────────────

    /** Retorna todos os registros como array associativo */
    protected function fetchAll(string $sql, array $bindings = []): array
    {
        return $this->query($sql, $bindings)->fetchAll(\PDO::FETCH_ASSOC);
    }

    /** Retorna o primeiro registro ou null */
    protected function fetchOne(string $sql, array $bindings = []): ?array
    {
        $row = $this->query($sql, $bindings)->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** Retorna um único valor escalar */
    protected function fetchScalar(string $sql, array $bindings = []): mixed
    {
        return $this->query($sql, $bindings)->fetchColumn();
    }

    /** Insert com RETURNING id */
    protected function insertReturningId(string $sql, array $bindings = []): string|int
    {
        return $this->query($sql, $bindings)->fetchColumn();
    }

    // ── QueryBuilder fluente ──────────────────────────────────────────────────

    protected function table(string $table): QueryBuilder
    {
        return new QueryBuilder($this->pdo, $table);
    }

    // ── Transações ────────────────────────────────────────────────────────────

    protected function transaction(callable $callback): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $callback();
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            Logger::error('Transação revertida', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    // ── Utilitários ───────────────────────────────────────────────────────────

    private function normalizeSql(string $sql): string
    {
        return preg_replace('/\s+/', ' ', trim($sql));
    }

    private function sanitizeBindings(array $bindings): array
    {
        return array_map(function ($v) {
            if (is_string($v) && strlen($v) > 100) return substr($v, 0, 100) . '...';
            return $v;
        }, $bindings);
    }
}
