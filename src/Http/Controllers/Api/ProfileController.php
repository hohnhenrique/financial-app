<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;

final class ProfileController extends ApiController
{
    public function index(): string
    {
        $this->requireAuth();
        $stmt = Connection::get()->prepare('SELECT id, name, email, role, currency, timezone, created_at FROM users WHERE id = ?');
        $stmt->execute([$this->userId()]);
        return $this->success($stmt->fetch());
    }

    public function update(): string
    {
        $this->requireAuth();
        $body  = $this->body();
        $name  = trim($body['name']  ?? '');
        $email = trim($body['email'] ?? '');

        if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error('Dados inválidos.');
        }

        $pdo    = Connection::get();
        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL');
        $exists->execute([$email, $this->userId()]);
        if ($exists->fetch()) return $this->error('E-mail já em uso.');

        $pdo->prepare('UPDATE users SET name = ?, email = ?, updated_at = now() WHERE id = ?')
            ->execute([$name, $email, $this->userId()]);

        $this->session->set('user_name',  $name);
        $this->session->set('user_email', $email);

        return $this->success(['name' => $name, 'email' => $email], 'Perfil atualizado.');
    }

    public function updatePassword(): string
    {
        $this->requireAuth();
        $body    = $this->body();
        $current = $body['current_password'] ?? '';
        $new     = $body['new_password']     ?? '';
        $confirm = $body['confirm_password'] ?? '';

        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$this->userId()]);
        $user = $stmt->fetch();

        if (!password_verify($current, $user['password_hash'])) return $this->error('Senha atual incorreta.');
        if (strlen($new) < 8)  return $this->error('Nova senha deve ter no mínimo 8 caracteres.');
        if ($new !== $confirm)  return $this->error('As senhas não coincidem.');

        $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
        $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?')
            ->execute([$hash, $this->userId()]);

        return $this->success(null, 'Senha alterada com sucesso.');
    }
}
