<?php

return new class {
    public function run(PDO $pdo): void {
        $email = 'demo@finance.com';

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL');
        $stmt->execute([$email]);
        $userId = $stmt->fetchColumn();

        if (!$userId) {
            $stmt = $pdo->prepare("
                INSERT INTO users (name, email, password_hash)
                VALUES (:name, :email, :password_hash)
                RETURNING id
            ");

            $stmt->execute([
                'name' => 'Usuario Demo',
                'email' => $email,
                'password_hash' => password_hash('12345678', PASSWORD_BCRYPT, ['cost' => 12]),
            ]);

            $userId = $stmt->fetchColumn();
        }

        $stmt = $pdo->prepare('SELECT id FROM accounts WHERE user_id = ? AND name = ? AND deleted_at IS NULL');
        $stmt->execute([$userId, 'Conta Demo']);

        if (!$stmt->fetchColumn()) {
            $stmt = $pdo->prepare("
                INSERT INTO accounts (user_id, name, type, initial_balance_cents, color)
                VALUES (:user_id, :name, :type, :initial_balance_cents, :color)
            ");

            $stmt->execute([
                'user_id' => $userId,
                'name' => 'Conta Demo',
                'type' => 'checking',
                'initial_balance_cents' => 100000,
                'color' => '#1B4F8A',
            ]);
        }
    }
};
