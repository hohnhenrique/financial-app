<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
use App\Core\Log\Logger;
use App\Core\Middleware\CsrfMiddleware;

final class AuthController extends ApiController
{
    private const MAX_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;

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

        if (!$user) {
            return $this->error('Credenciais inválidas.', 401);
        }

        // Usuário inativo
        if (!$user['is_active']) {
            Logger::warning('Login attempt on inactive user', ['email' => $email]);
            return $this->error('Sua conta está inativa. Entre em contato com o administrador.', 403);
        }

        // Bloqueio por tentativas
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            $minutes = ceil((strtotime($user['locked_until']) - time()) / 60);
            return $this->error("Conta bloqueada. Tente novamente em {$minutes} minuto(s).", 403);
        }

        if (!password_verify($password, $user['password_hash'])) {
            $attempts = $user['login_attempts'] + 1;
            if ($attempts >= self::MAX_ATTEMPTS) {
                $lockUntil = date('Y-m-d H:i:s', strtotime('+' . self::LOCK_MINUTES . ' minutes'));
                $pdo->prepare('UPDATE users SET login_attempts=?, locked_until=? WHERE id=?')
                    ->execute([$attempts, $lockUntil, $user['id']]);
                return $this->error('Muitas tentativas. Conta bloqueada por ' . self::LOCK_MINUTES . ' minutos.', 403);
            }
            $pdo->prepare('UPDATE users SET login_attempts=? WHERE id=?')->execute([$attempts, $user['id']]);
            return $this->error('Credenciais inválidas.', 401);
        }

        // Login bem-sucedido
        $pdo->prepare('UPDATE users SET login_attempts=0, locked_until=NULL, last_login_at=now() WHERE id=?')
            ->execute([$user['id']]);

        $this->session->set('user_id',    $user['id']);
        $this->session->set('user_name',  $user['name']);
        $this->session->set('user_email', $user['email']);
        $this->session->set('user_role',  $user['role']);

        Logger::info('User logged in', ['user_id' => $user['id']]);

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
        $token    = trim($body['invite_token'] ?? '');

        if (!$name || !$email || !$password) return $this->error('Preencha todos os campos.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return $this->error('E-mail inválido.');
        if (strlen($password) < 8) return $this->error('Senha deve ter no mínimo 8 caracteres.');

        $pdo  = Connection::get();
        $mode = $_ENV['REGISTRATION_MODE'] ?? 'invite_only';

        // Validação do token de convite
        if ($mode === 'invite_only') {
            if (empty($token)) {
                return $this->error('Código de convite obrigatório para criar conta.', 403);
            }

            $inviteStmt = $pdo->prepare("
                SELECT * FROM invite_tokens
                WHERE token=? AND is_active=true AND used_at IS NULL AND expires_at > now()
            ");
            $inviteStmt->execute([$token]);
            $invite = $inviteStmt->fetch();

            if (!$invite) {
                return $this->error('Código de convite inválido ou expirado.', 403);
            }
        } elseif ($mode === 'disabled') {
            return $this->error('Cadastro de novos usuários está desabilitado.', 403);
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE email=? AND deleted_at IS NULL');
        $exists->execute([$email]);
        if ($exists->fetch()) return $this->error('E-mail já cadastrado.');

        $hash   = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt   = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?) RETURNING id');
        $stmt->execute([$name, $email, $hash]);
        $userId = $stmt->fetchColumn();

        // Conta padrão
        $pdo->prepare("INSERT INTO accounts (user_id, name, type, initial_balance_cents, color) VALUES (?,'Conta Principal','checking',0,'#1B4F8A')")
            ->execute([$userId]);

        // Marca o convite como usado
        if (isset($invite)) {
            $pdo->prepare("UPDATE invite_tokens SET used_by=?, used_at=now(), is_active=false WHERE id=?")
                ->execute([$userId, $invite['id']]);
        }

        $this->session->set('user_id',    $userId);
        $this->session->set('user_name',  $name);
        $this->session->set('user_email', $email);
        $this->session->set('user_role',  'user');

        Logger::info('New user registered', ['user_id' => $userId, 'email' => $email]);
        return $this->success(['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'user'], 'Conta criada.', 201);
    }

    public function logout(): string
    {
        Logger::info('User logged out', ['user_id' => $this->session->get('user_id')]);
        $this->session->destroy();
        return $this->success(null, 'Logout realizado.');
    }

    public function me(): string
    {
        $this->requireAuth();
        $token = CsrfMiddleware::generateToken();
        header('X-CSRF-Token: ' . $token);

        return $this->success([
            'id'    => $this->session->get('user_id'),
            'name'  => $this->session->get('user_name'),
            'email' => $this->session->get('user_email'),
            'role'  => $this->session->get('user_role'),
        ]);
    }
}
