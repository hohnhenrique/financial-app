<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

use App\Core\Database\Connection;
use PDO;
use PDOStatement;

abstract class AbstractRepository
{
    protected PDO $pdo;

    public function __construct()
    {
        $this->pdo = Connection::get();
    }

    protected function query(string $sql, array $bindings = []): PDOStatement
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($bindings);
        return $stmt;
    }

    protected function fetchOne(string $sql, array $bindings = []): ?array
    {
        $row = $this->query($sql, $bindings)->fetch();
        return $row ?: null;
    }

    /** @return array[] */
    protected function fetchAll(string $sql, array $bindings = []): array
    {
        return $this->query($sql, $bindings)->fetchAll();
    }

    protected function insertReturningId(string $sql, array $bindings = []): int|string
    {
        return $this->query($sql, $bindings)->fetchColumn();
    }

    protected function count(string $table, string $where = '', array $bindings = []): int
    {
        $sql = "SELECT COUNT(*) FROM {$table}" . ($where ? " WHERE {$where}" : '');
        return (int) $this->query($sql, $bindings)->fetchColumn();
    }

    protected function paginate(string $sql, array $bindings, int $page, int $perPage): array
    {
        $offset  = ($page - 1) * $perPage;
        $paged   = $sql . " LIMIT {$perPage} OFFSET {$offset}";
        return $this->fetchAll($paged, $bindings);
    }
}
