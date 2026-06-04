<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
use App\Core\Log\Logger;

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

    // ── Listar usuários ───────────────────────────────────────────────────────
    public function index(): string
    {
        $this->requireAdmin();
        $users = Connection::get()->query("
            SELECT id, name, email, role, phone, birth_date, bio, timezone,
                   is_active, last_login_at, created_at,
                   (SELECT COUNT(*) FROM transactions WHERE user_id=users.id AND deleted_at IS NULL) AS tx_count
            FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC
        ")->fetchAll();
        return $this->success($users);
    }

    // ── Criar usuário ─────────────────────────────────────────────────────────
    public function store(): string
    {
        $this->requireAdmin();
        $b = $this->body();

        $name     = trim($b['name']     ?? '');
        $email    = trim($b['email']    ?? '');
        $password = trim($b['password'] ?? '');
        $role     = in_array($b['role'] ?? 'user', ['user','admin']) ? $b['role'] : 'user';

        if (!$name || !$email || !$password) return $this->error('Nome, e-mail e senha são obrigatórios.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return $this->error('E-mail inválido.');
        if (strlen($password) < 8) return $this->error('Senha mínima: 8 caracteres.');

        $pdo = Connection::get();
        $exists = $pdo->prepare('SELECT id FROM users WHERE email=? AND deleted_at IS NULL');
        $exists->execute([$email]);
        if ($exists->fetch()) return $this->error('E-mail já cadastrado.');

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?) RETURNING id');
        $stmt->execute([$name, $email, $hash, $role]);
        $userId = $stmt->fetchColumn();

        $pdo->prepare("INSERT INTO accounts (user_id, name, type, initial_balance_cents, color) VALUES (?,'Conta Principal','checking',0,'#1B4F8A')")
            ->execute([$userId]);

        Logger::info('Admin created user', ['admin' => $this->userId(), 'new_user' => $userId]);
        return $this->success(['id' => $userId], 'Usuário criado com sucesso.', 201);
    }

    // ── Editar usuário ────────────────────────────────────────────────────────
    public function update(string $id): string
    {
        $this->requireAdmin();
        $b = $this->body();

        $name  = trim($b['name']  ?? '');
        $email = trim($b['email'] ?? '');
        $role  = in_array($b['role'] ?? 'user', ['user','admin']) ? $b['role'] : 'user';
        $phone = trim($b['phone'] ?? '');
        $bio   = trim($b['bio']   ?? '');

        if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error('Dados inválidos.');
        }

        // Não pode remover o próprio admin
        if ($id === (string)$this->userId() && $role !== 'admin') {
            return $this->error('Você não pode remover seu próprio acesso de administrador.');
        }

        $pdo = Connection::get();
        $exists = $pdo->prepare('SELECT id FROM users WHERE email=? AND id != ? AND deleted_at IS NULL');
        $exists->execute([$email, $id]);
        if ($exists->fetch()) return $this->error('E-mail já em uso.');

        $pdo->prepare("
            UPDATE users SET name=?, email=?, role=?, phone=?, bio=?, updated_at=now()
            WHERE id=? AND deleted_at IS NULL
        ")->execute([$name, $email, $role, $phone ?: null, $bio ?: null, $id]);

        Logger::info('Admin updated user', ['admin' => $this->userId(), 'user' => $id]);
        return $this->success(null, 'Usuário atualizado.');
    }

    // ── Resetar senha ─────────────────────────────────────────────────────────
    public function resetPassword(string $id): string
    {
        $this->requireAdmin();
        $password = trim($this->body()['password'] ?? '');

        if (strlen($password) < 8) return $this->error('Senha mínima: 8 caracteres.');

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        Connection::get()->prepare('UPDATE users SET password_hash=?, updated_at=now() WHERE id=?')
            ->execute([$hash, $id]);

        Logger::info('Admin reset user password', ['admin' => $this->userId(), 'user' => $id]);
        return $this->success(null, 'Senha redefinida com sucesso.');
    }

    // ── Ativar / Inativar ─────────────────────────────────────────────────────
    public function toggleActive(string $id): string
    {
        $this->requireAdmin();

        if ($id === (string)$this->userId()) {
            return $this->error('Você não pode inativar sua própria conta.');
        }

        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT is_active FROM users WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        if (!$user) return $this->error('Usuário não encontrado.', 404);

        $newStatus = !$user['is_active'];
        $pdo->prepare('UPDATE users SET is_active=?, updated_at=now() WHERE id=?')
            ->execute([$newStatus, $id]);

        Logger::info('Admin toggled user active', ['admin' => $this->userId(), 'user' => $id, 'is_active' => $newStatus]);
        return $this->success(['is_active' => $newStatus], $newStatus ? 'Usuário ativado.' : 'Usuário inativado.');
    }

    // ── Alterar role ──────────────────────────────────────────────────────────
    public function toggleRole(string $id): string
    {
        $this->requireAdmin();
        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT role FROM users WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        if (!$user) return $this->error('Usuário não encontrado.', 404);

        $newRole = $user['role'] === 'admin' ? 'user' : 'admin';
        $pdo->prepare('UPDATE users SET role=?, updated_at=now() WHERE id=?')->execute([$newRole, $id]);
        return $this->success(['role' => $newRole], 'Perfil atualizado.');
    }

    // ── Excluir ───────────────────────────────────────────────────────────────
    public function delete(string $id): string
    {
        $this->requireAdmin();
        if ($id === (string)$this->userId()) return $this->error('Você não pode excluir sua própria conta.');
        Connection::get()->prepare('UPDATE users SET deleted_at=now() WHERE id=?')->execute([$id]);
        Logger::info('Admin deleted user', ['admin' => $this->userId(), 'user' => $id]);
        return $this->success(null, 'Usuário removido.');
    }

    // ── Tokens de convite ─────────────────────────────────────────────────────
    public function listTokens(): string
    {
        $this->requireAdmin();
        $stmt = Connection::get()->prepare("
            SELECT it.*, u.name AS created_by_name, u2.name AS used_by_name
            FROM invite_tokens it
            JOIN users u ON u.id = it.created_by
            LEFT JOIN users u2 ON u2.id = it.used_by
            ORDER BY it.created_at DESC LIMIT 50
        ");
        $stmt->execute();
        return $this->success($stmt->fetchAll());
    }

    public function createToken(): string
    {
        $this->requireAdmin();
        $note  = trim($this->body()['note'] ?? '');
        $hours = max(1, min(168, (int)($this->body()['expires_hours'] ?? 72)));
        $token = bin2hex(random_bytes(24));

        $pdo = Connection::get();
        $pdo->prepare("
            INSERT INTO invite_tokens (token, created_by, note, expires_at)
            VALUES (?, ?, ?, now() + interval '1 hour' * ?)
        ")->execute([$token, $this->userId(), $note ?: null, $hours]);

        Logger::info('Admin created invite token', ['admin' => $this->userId(), 'hours' => $hours]);
        return $this->success(['token' => $token, 'expires_hours' => $hours], 'Token de convite criado.');
    }

    public function revokeToken(string $id): string
    {
        $this->requireAdmin();
        Connection::get()->prepare('UPDATE invite_tokens SET is_active=false WHERE id=?')->execute([$id]);
        return $this->success(null, 'Token revogado.');
    }
}
