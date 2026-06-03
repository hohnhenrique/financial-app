<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;
use App\Core\Database\Connection;

final class SearchController extends ApiController
{
    public function search(): string
    {
        $this->requireAuth();
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 2) return $this->success(['results' => []]);

        $pdo     = Connection::get();
        $like    = "%{$q}%";
        $userId  = $this->userId();
        $results = [];

        // Transações
        $stmt = $pdo->prepare("
            SELECT id, description AS label, amount_cents, type, transaction_date AS date,
                   'transaction' AS type_name
            FROM transactions
            WHERE user_id=? AND deleted_at IS NULL AND description ILIKE ?
            ORDER BY transaction_date DESC LIMIT 5
        ");
        $stmt->execute([$userId, $like]);
        foreach ($stmt->fetchAll() as $r) $results[] = $r;

        // Contas
        $stmt = $pdo->prepare("SELECT id, name AS label, 'account' AS type_name FROM accounts WHERE user_id=? AND name ILIKE ? LIMIT 3");
        $stmt->execute([$userId, $like]);
        foreach ($stmt->fetchAll() as $r) $results[] = $r;

        // Categorias
        $stmt = $pdo->prepare("SELECT id, name AS label, color, 'category' AS type_name FROM categories WHERE (user_id=? OR user_id IS NULL) AND name ILIKE ? LIMIT 3");
        $stmt->execute([$userId, $like]);
        foreach ($stmt->fetchAll() as $r) $results[] = $r;

        // Metas pessoais
        $stmt = $pdo->prepare("SELECT id, title AS label, status, 'goal' AS type_name FROM personal_goals WHERE user_id=? AND title ILIKE ? LIMIT 3");
        $stmt->execute([$userId, $like]);
        foreach ($stmt->fetchAll() as $r) $results[] = $r;

        // Tarefas
        $stmt = $pdo->prepare("SELECT id, title AS label, status, 'task' AS type_name FROM personal_tasks WHERE user_id=? AND title ILIKE ? LIMIT 3");
        $stmt->execute([$userId, $like]);
        foreach ($stmt->fetchAll() as $r) $results[] = $r;

        return $this->success(['query' => $q, 'results' => $results]);
    }
}
