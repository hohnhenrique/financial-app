<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;
use App\Core\Database\Connection;

final class PersonalTaskController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();
        $status = $_GET['status'] ?? '';
        $sql = "
            SELECT t.*, p.label AS priority_label, p.color AS priority_color, p.level AS priority_level
            FROM personal_tasks t
            LEFT JOIN priorities p ON p.id = t.priority_id
            WHERE t.user_id=?
        ";
        $bindings = [$this->userId()];
        if ($status) { $sql .= ' AND t.status=?'; $bindings[] = $status; }
        $sql .= ' ORDER BY
            CASE t.status WHEN \'todo\' THEN 1 WHEN \'in_progress\' THEN 2 WHEN \'done\' THEN 3 ELSE 4 END,
            COALESCE(p.level, 0) DESC,
            t.due_date ASC NULLS LAST,
            t.created_at DESC';
        $stmt = Connection::get()->prepare($sql);
        $stmt->execute($bindings);
        return $this->success($stmt->fetchAll());
    }

    public function store(): string
    {
        $this->requireAuth();
        $b = $this->body();
        $stmt = Connection::get()->prepare("
            INSERT INTO personal_tasks
                (user_id, priority_id, title, description, category, status, due_date, color, tags)
            VALUES (?,?,?,?,?,?,?,?,?) RETURNING id
        ");
        $stmt->execute([
            $this->userId(), $b['priority_id'] ?? null, $b['title'] ?? '',
            $b['description'] ?? null, $b['category'] ?? 'pessoal',
            $b['status'] ?? 'todo', $b['due_date'] ?? null,
            $b['color'] ?? '#6366f1',
            is_array($b['tags'] ?? null) ? implode(',', $b['tags']) : ($b['tags'] ?? null),
        ]);
        return $this->success(['id' => $stmt->fetchColumn()], 'Tarefa criada.', 201);
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        $b           = $this->body();
        $completedAt = ($b['status'] ?? '') === 'done' ? date('Y-m-d H:i:s') : null;
        Connection::get()->prepare("
            UPDATE personal_tasks SET
                priority_id=?, title=?, description=?, category=?,
                status=?, due_date=?, color=?, tags=?,
                completed_at=COALESCE(:completed_at, completed_at), updated_at=now()
            WHERE id=? AND user_id=?
        ")->execute([
            $b['priority_id'] ?? null, $b['title'] ?? '', $b['description'] ?? null,
            $b['category'] ?? 'pessoal', $b['status'] ?? 'todo',
            $b['due_date'] ?? null, $b['color'] ?? '#6366f1',
            is_array($b['tags'] ?? null) ? implode(',', $b['tags']) : ($b['tags'] ?? null),
            $completedAt, $id, $this->userId(),
        ]);
        return $this->success(null, 'Tarefa atualizada.');
    }

    public function updateStatus(string $id): string
    {
        $this->requireAuth();
        $status      = $this->body()['status'] ?? 'todo';
        $completedAt = $status === 'done' ? 'now()' : 'NULL';
        Connection::get()->prepare("
            UPDATE personal_tasks SET status=?, completed_at={$completedAt}, updated_at=now()
            WHERE id=? AND user_id=?
        ")->execute([$status, $id, $this->userId()]);
        return $this->success(null, 'Status atualizado.');
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        Connection::get()->prepare('DELETE FROM personal_tasks WHERE id=? AND user_id=?')
            ->execute([$id, $this->userId()]);
        return $this->success(null, 'Tarefa removida.');
    }
}
