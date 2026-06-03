<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;
use App\Core\Database\Connection;

final class PersonalGoalController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();
        $status = $_GET['status'] ?? '';
        $sql = "
            SELECT g.*, p.label AS priority_label, p.color AS priority_color, p.level AS priority_level
            FROM personal_goals g
            LEFT JOIN priorities p ON p.id = g.priority_id
            WHERE g.user_id = ?
        ";
        $bindings = [$this->userId()];
        if ($status) { $sql .= ' AND g.status = ?'; $bindings[] = $status; }
        $sql .= ' ORDER BY g.created_at DESC';

        $stmt = Connection::get()->prepare($sql);
        $stmt->execute($bindings);
        return $this->success($stmt->fetchAll());
    }

    public function store(): string
    {
        $this->requireAuth();
        $b = $this->body();
        $pdo = Connection::get();
        $stmt = $pdo->prepare("
            INSERT INTO personal_goals
                (user_id, priority_id, title, description, category, target_value, current_value, unit, color, icon, deadline)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            RETURNING id
        ");
        $stmt->execute([
            $this->userId(), $b['priority_id'] ?? null, $b['title'] ?? '',
            $b['description'] ?? null, $b['category'] ?? 'outros',
            $b['target_value'] ?? 1, $b['current_value'] ?? 0,
            $b['unit'] ?? '%', $b['color'] ?? '#3b82f6',
            $b['icon'] ?? 'target', $b['deadline'] ?? null,
        ]);
        return $this->success(['id' => $stmt->fetchColumn()], 'Meta criada.', 201);
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        $b = $this->body();
        Connection::get()->prepare("
            UPDATE personal_goals SET
                priority_id=?, title=?, description=?, category=?,
                target_value=?, current_value=?, unit=?, color=?,
                icon=?, deadline=?, status=?, updated_at=now()
            WHERE id=? AND user_id=?
        ")->execute([
            $b['priority_id'] ?? null, $b['title'] ?? '',
            $b['description'] ?? null, $b['category'] ?? 'outros',
            $b['target_value'] ?? 1, $b['current_value'] ?? 0,
            $b['unit'] ?? '%', $b['color'] ?? '#3b82f6',
            $b['icon'] ?? 'target', $b['deadline'] ?? null,
            $b['status'] ?? 'active', $id, $this->userId(),
        ]);
        return $this->success(null, 'Meta atualizada.');
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        Connection::get()->prepare('DELETE FROM personal_goals WHERE id=? AND user_id=?')
            ->execute([$id, $this->userId()]);
        return $this->success(null, 'Meta removida.');
    }

    public function priorities(): string
    {
        $this->requireAuth();
        $stmt = Connection::get()->query('SELECT * FROM priorities ORDER BY level ASC');
        return $this->success($stmt->fetchAll());
    }
}
