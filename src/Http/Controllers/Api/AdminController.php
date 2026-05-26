<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;

final class AdminController extends ApiController
{
    private function requireAdmin(): void
    {
        $this->requireAuth();
        if ($this->session->get('user_role') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
            exit;
        }
    }

    public function index(): string
    {
        $this->requireAdmin();
        $users = Connection::get()->query("
            SELECT id, name, email, role, created_at,
                   (SELECT COUNT(*) FROM transactions WHERE user_id = users.id AND deleted_at IS NULL) AS tx_count
            FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC
        ")->fetchAll();
        return $this->success($users);
    }

    public function toggleRole(string $id): string
    {
        $this->requireAdmin();
        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) return $this->error('Usuário não encontrado.', 404);

        $newRole = $user['role'] === 'admin' ? 'user' : 'admin';
        $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$newRole, $id]);
        return $this->success(['role' => $newRole], 'Perfil atualizado.');
    }

    public function delete(string $id): string
    {
        $this->requireAdmin();
        if ((string) $this->userId() === $id) return $this->error('Você não pode excluir sua própria conta.');
        Connection::get()->prepare('UPDATE users SET deleted_at = now() WHERE id = ?')->execute([$id]);
        return $this->success(null, 'Usuário removido.');
    }
}
