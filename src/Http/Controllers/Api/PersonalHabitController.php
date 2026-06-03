<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;
use App\Core\Database\Connection;

final class PersonalHabitController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();
        $today = date('Y-m-d');
        $stmt  = Connection::get()->prepare("
            SELECT h.*, p.label AS priority_label, p.color AS priority_color,
                -- Log de hoje
                (SELECT count FROM personal_habit_logs WHERE habit_id=h.id AND logged_date=?) AS today_count,
                -- Streak atual (dias consecutivos até hoje)
                (SELECT COUNT(*) FROM (
                    SELECT logged_date,
                           logged_date - (ROW_NUMBER() OVER (ORDER BY logged_date DESC))::int AS grp
                    FROM personal_habit_logs
                    WHERE habit_id=h.id AND logged_date <= ?
                ) s WHERE grp = (
                    SELECT logged_date - (ROW_NUMBER() OVER (ORDER BY logged_date DESC))::int
                    FROM personal_habit_logs
                    WHERE habit_id=h.id AND logged_date=?
                )
                ) AS streak,
                -- Logs dos últimos 7 dias
                (SELECT json_agg(json_build_object('date', logged_date, 'count', count) ORDER BY logged_date)
                 FROM personal_habit_logs
                 WHERE habit_id=h.id AND logged_date >= ? - INTERVAL '6 days') AS week_logs
            FROM personal_habits h
            LEFT JOIN priorities p ON p.id = h.priority_id
            WHERE h.user_id=? AND h.is_active=true
            ORDER BY h.created_at ASC
        ");
        $stmt->execute([$today, $today, $today, $today, $this->userId()]);
        return $this->success($stmt->fetchAll());
    }

    public function store(): string
    {
        $this->requireAuth();
        $b = $this->body();
        $stmt = Connection::get()->prepare("
            INSERT INTO personal_habits
                (user_id, priority_id, title, description, category, frequency, target_count, color, icon)
            VALUES (?,?,?,?,?,?,?,?,?) RETURNING id
        ");
        $stmt->execute([
            $this->userId(), $b['priority_id'] ?? null, $b['title'] ?? '',
            $b['description'] ?? null, $b['category'] ?? 'saude',
            $b['frequency'] ?? 'daily', $b['target_count'] ?? 1,
            $b['color'] ?? '#10b981', $b['icon'] ?? 'check-circle',
        ]);
        return $this->success(['id' => $stmt->fetchColumn()], 'Hábito criado.', 201);
    }

    public function update(string $id): string
    {
        $this->requireAuth();
        $b = $this->body();
        Connection::get()->prepare("
            UPDATE personal_habits SET
                priority_id=?, title=?, description=?, category=?,
                frequency=?, target_count=?, color=?, icon=?, is_active=?, updated_at=now()
            WHERE id=? AND user_id=?
        ")->execute([
            $b['priority_id'] ?? null, $b['title'] ?? '', $b['description'] ?? null,
            $b['category'] ?? 'saude', $b['frequency'] ?? 'daily',
            $b['target_count'] ?? 1, $b['color'] ?? '#10b981',
            $b['icon'] ?? 'check-circle', $b['is_active'] ?? true,
            $id, $this->userId(),
        ]);
        return $this->success(null, 'Hábito atualizado.');
    }

    public function delete(string $id): string
    {
        $this->requireAuth();
        Connection::get()->prepare('DELETE FROM personal_habits WHERE id=? AND user_id=?')
            ->execute([$id, $this->userId()]);
        return $this->success(null, 'Hábito removido.');
    }

    public function log(string $id): string
    {
        $this->requireAuth();
        $date  = $this->body()['date'] ?? date('Y-m-d');
        $notes = $this->body()['notes'] ?? null;
        $pdo   = Connection::get();

        $exists = $pdo->prepare('SELECT id FROM personal_habit_logs WHERE habit_id=? AND logged_date=?');
        $exists->execute([$id, $date]);

        if ($exists->fetch()) {
            $pdo->prepare('DELETE FROM personal_habit_logs WHERE habit_id=? AND logged_date=?')
                ->execute([$id, $date]);
            return $this->success(['logged' => false], 'Registro removido.');
        }

        $pdo->prepare('INSERT INTO personal_habit_logs (habit_id, user_id, logged_date, notes) VALUES (?,?,?,?)')
            ->execute([$id, $this->userId(), $date, $notes]);
        return $this->success(['logged' => true], 'Hábito registrado!');
    }
}
