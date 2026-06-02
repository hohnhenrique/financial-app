<?php

declare(strict_types=1);

namespace App\Infrastructure\Repository;

/**
 * QueryBuilder fluente simples para uso nos repositories.
 * Inspirado na API do Laravel Query Builder.
 *
 * Exemplos:
 *   $this->table('users')->where('email', $email)->whereNull('deleted_at')->first()
 *   $this->table('transactions')->where('user_id', $id)->orderBy('transaction_date', 'DESC')->paginate(1, 10)->get()
 */
final class QueryBuilder
{
    private array   $wheres    = [];
    private array   $bindings  = [];
    private array   $selects   = ['*'];
    private string  $orderBy   = '';
    private ?int    $limitVal  = null;
    private ?int    $offsetVal = null;
    private array   $joins     = [];

    public function __construct(
        private readonly \PDO    $pdo,
        private readonly string  $table,
    ) {}

    // ── SELECT ────────────────────────────────────────────────────────────────

    public function select(string ...$columns): self
    {
        $this->selects = $columns;
        return $this;
    }

    // ── JOINs ─────────────────────────────────────────────────────────────────

    public function join(string $table, string $on, string $type = 'INNER'): self
    {
        $this->joins[] = "{$type} JOIN {$table} ON {$on}";
        return $this;
    }

    public function leftJoin(string $table, string $on): self
    {
        return $this->join($table, $on, 'LEFT');
    }

    // ── WHERE ─────────────────────────────────────────────────────────────────

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
        if (empty($values)) {
            $this->wheres[] = '1 = 0'; // nenhum resultado
            return $this;
        }
        $placeholders   = implode(',', array_fill(0, count($values), '?'));
        $this->wheres[] = "{$column} IN ({$placeholders})";
        $this->bindings = array_merge($this->bindings, $values);
        return $this;
    }

    public function whereRaw(string $sql, array $bindings = []): self
    {
        $this->wheres[]  = $sql;
        $this->bindings  = array_merge($this->bindings, $bindings);
        return $this;
    }

    // ── ORDER, LIMIT, OFFSET ──────────────────────────────────────────────────

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $dir = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
        $this->orderBy = "ORDER BY {$column} {$dir}";
        return $this;
    }

    public function latest(string $column = 'created_at'): self
    {
        return $this->orderBy($column, 'DESC');
    }

    public function oldest(string $column = 'created_at'): self
    {
        return $this->orderBy($column, 'ASC');
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

    // ── EXECUÇÃO ──────────────────────────────────────────────────────────────

    public function get(): array
    {
        $stmt = $this->pdo->prepare($this->buildSelect());
        $stmt->execute($this->bindings);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function first(): ?array
    {
        $this->limit(1);
        $stmt = $this->pdo->prepare($this->buildSelect());
        $stmt->execute($this->bindings);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function count(): int
    {
        $where = $this->buildWhere();
        $joins = implode(' ', $this->joins);
        $sql   = "SELECT COUNT(*) FROM {$this->table} {$joins} {$where}";
        $stmt  = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        return (int) $stmt->fetchColumn();
    }

    public function exists(): bool
    {
        return $this->count() > 0;
    }

    public function insert(array $data): string|int
    {
        $cols  = implode(', ', array_keys($data));
        $phs   = implode(', ', array_fill(0, count($data), '?'));
        $sql   = "INSERT INTO {$this->table} ({$cols}) VALUES ({$phs}) RETURNING id";
        $stmt  = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));
        return $stmt->fetchColumn();
    }

    public function insertMany(array $rows): int
    {
        if (empty($rows)) return 0;
        $cols  = implode(', ', array_keys($rows[0]));
        $phs   = '(' . implode(', ', array_fill(0, count($rows[0]), '?')) . ')';
        $allPhs= implode(', ', array_fill(0, count($rows), $phs));
        $sql   = "INSERT INTO {$this->table} ({$cols}) VALUES {$allPhs}";
        $flat  = array_merge(...array_map('array_values', $rows));
        $stmt  = $this->pdo->prepare($sql);
        $stmt->execute($flat);
        return $stmt->rowCount();
    }

    public function update(array $data): int
    {
        $sets  = implode(', ', array_map(fn($c) => "{$c} = ?", array_keys($data)));
        $where = $this->buildWhere();
        $sql   = "UPDATE {$this->table} SET {$sets} {$where}";
        $stmt  = $this->pdo->prepare($sql);
        $stmt->execute([...array_values($data), ...$this->bindings]);
        return $stmt->rowCount();
    }

    public function delete(): int
    {
        $where = $this->buildWhere();
        $sql   = "DELETE FROM {$this->table} {$where}";
        $stmt  = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        return $stmt->rowCount();
    }

    public function softDelete(string $column = 'deleted_at'): int
    {
        return $this->update([$column => date('Y-m-d H:i:s')]);
    }

    // ── PRIVATE ───────────────────────────────────────────────────────────────

    private function buildSelect(): string
    {
        $cols  = implode(', ', $this->selects);
        $joins = implode(' ', $this->joins);
        $where = $this->buildWhere();
        $sql   = "SELECT {$cols} FROM {$this->table} {$joins} {$where} {$this->orderBy}";
        if ($this->limitVal  !== null) $sql .= " LIMIT {$this->limitVal}";
        if ($this->offsetVal !== null) $sql .= " OFFSET {$this->offsetVal}";
        return $sql;
    }

    private function buildWhere(): string
    {
        return $this->wheres ? 'WHERE ' . implode(' AND ', $this->wheres) : '';
    }
}
