<?php

declare(strict_types=1);

namespace App\Core\Database;

final class QueryBuilder
{
    private string  $table     = '';
    private array   $wheres    = [];
    private array   $bindings  = [];
    private ?int    $limitVal  = null;
    private ?int    $offsetVal = null;
    private string  $orderBy   = '';
    private array   $selects   = ['*'];
    private \PDO    $pdo;

    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public static function table(string $table): self
    {
        $instance = new self(Connection::get());
        $instance->table = $table;
        return $instance;
    }

    public function select(string ...$columns): self
    {
        $this->selects = $columns;
        return $this;
    }

    public function where(string $column, mixed $value, string $operator = '='): self
    {
        $this->wheres[]   = "{$column} {$operator} ?";
        $this->bindings[] = $value;
        return $this;
    }

    public function whereNull(string $column): self
    {
        $this->wheres[] = "{$column} IS NULL";
        return $this;
    }

    public function whereNotNull(string $column): self
    {
        $this->wheres[] = "{$column} IS NOT NULL";
        return $this;
    }

    public function whereIn(string $column, array $values): self
    {
        $placeholders   = implode(',', array_fill(0, count($values), '?'));
        $this->wheres[] = "{$column} IN ({$placeholders})";
        $this->bindings = array_merge($this->bindings, $values);
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $this->orderBy = "ORDER BY {$column} " . strtoupper($direction);
        return $this;
    }

    public function limit(int $limit): self
    {
        $this->limitVal = $limit;
        return $this;
    }

    public function offset(int $offset): self
    {
        $this->offsetVal = $offset;
        return $this;
    }

    public function paginate(int $page, int $perPage): self
    {
        $this->limitVal  = $perPage;
        $this->offsetVal = ($page - 1) * $perPage;
        return $this;
    }

    private function buildSelect(): string
    {
        $cols  = implode(', ', $this->selects);
        $sql   = "SELECT {$cols} FROM {$this->table}";
        if ($this->wheres) $sql .= ' WHERE ' . implode(' AND ', $this->wheres);
        if ($this->orderBy) $sql .= ' ' . $this->orderBy;
        if ($this->limitVal  !== null) $sql .= " LIMIT {$this->limitVal}";
        if ($this->offsetVal !== null) $sql .= " OFFSET {$this->offsetVal}";
        return $sql;
    }

    public function get(): array
    {
        $stmt = $this->pdo->prepare($this->buildSelect());
        $stmt->execute($this->bindings);
        return $stmt->fetchAll();
    }

    public function first(): ?array
    {
        $this->limit(1);
        $stmt = $this->pdo->prepare($this->buildSelect());
        $stmt->execute($this->bindings);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function count(): int
    {
        $sql = "SELECT COUNT(*) FROM {$this->table}";
        if ($this->wheres) $sql .= ' WHERE ' . implode(' AND ', $this->wheres);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        return (int) $stmt->fetchColumn();
    }

    public function insert(array $data): int|string
    {
        $cols   = implode(', ', array_keys($data));
        $phs    = implode(', ', array_fill(0, count($data), '?'));
        $sql    = "INSERT INTO {$this->table} ({$cols}) VALUES ({$phs}) RETURNING id";
        $stmt   = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));
        return $stmt->fetchColumn();
    }

    public function update(array $data): int
    {
        $sets = implode(', ', array_map(fn($c) => "{$c} = ?", array_keys($data)));
        $sql  = "UPDATE {$this->table} SET {$sets}";
        if ($this->wheres) $sql .= ' WHERE ' . implode(' AND ', $this->wheres);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([...array_values($data), ...$this->bindings]);
        return $stmt->rowCount();
    }

    public function delete(): int
    {
        $sql = "DELETE FROM {$this->table}";
        if ($this->wheres) $sql .= ' WHERE ' . implode(' AND ', $this->wheres);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        return $stmt->rowCount();
    }

    public function softDelete(): int
    {
        return $this->update(['deleted_at' => date('Y-m-d H:i:s')]);
    }
}
