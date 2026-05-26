<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
use App\Core\Middleware\CsrfMiddleware;

final class AuthController extends ApiController
{
    public function login(): string
    {
        $body     = $this->body();
        $email    = trim($body['email']    ?? '');
        $password = trim($body['password'] ?? '');

        if (!$email || !$password) {
            return $this->error('E-mail e senha são obrigatórios.');
        }

        $pdo  = Connection::get();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            return $this->error('Credenciais inválidas.', 401);
        }

        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            return $this->error('Conta bloqueada temporariamente.', 403);
        }

        $pdo->prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?')
            ->execute([$user['id']]);

        $this->session->set('user_id',    $user['id']);
        $this->session->set('user_name',  $user['name']);
        $this->session->set('user_email', $user['email']);
        $this->session->set('user_role',  $user['role']);

        return $this->success([
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ], 'Login realizado.');
    }

    public function register(): string
    {
        $body     = $this->body();
        $name     = trim($body['name']     ?? '');
        $email    = trim($body['email']    ?? '');
        $password = trim($body['password'] ?? '');

        if (!$name || !$email || !$password) return $this->error('Preencha todos os campos.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return $this->error('E-mail inválido.');
        if (strlen($password) < 8) return $this->error('Senha deve ter no mínimo 8 caracteres.');

        $pdo = Connection::get();

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL');
        $exists->execute([$email]);
        if ($exists->fetch()) return $this->error('E-mail já cadastrado.');

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id');
        $stmt->execute([$name, $email, $hash]);
        $userId = $stmt->fetchColumn();

        $pdo->prepare("INSERT INTO accounts (user_id, name, type, initial_balance_cents, color) VALUES (?, 'Conta Principal', 'checking', 0, '#1B4F8A')")
            ->execute([$userId]);

        $this->session->set('user_id',    $userId);
        $this->session->set('user_name',  $name);
        $this->session->set('user_email', $email);
        $this->session->set('user_role',  'user');

        return $this->success(['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'user'], 'Conta criada.', 201);
    }

    public function logout(): string
    {
        $this->session->destroy();
        return $this->success(null, 'Logout realizado.');
    }

    public function me(): string
    {
        $this->requireAuth();

        // Gera/retorna o token CSRF via cookie httpOnly separado
        $token = CsrfMiddleware::generateToken();
        header('X-CSRF-Token: ' . $token);  // header da resposta

        return $this->success([
            'id'    => $this->session->get('user_id'),
            'name'  => $this->session->get('user_name'),
            'email' => $this->session->get('user_email'),
            'role'  => $this->session->get('user_role'),
        ]);
    }
}
