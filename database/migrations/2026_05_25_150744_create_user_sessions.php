<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS user_sessions (
                id          BIGSERIAL PRIMARY KEY,
                user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash  VARCHAR(255) NOT NULL,
                ip_address  INET,
                user_agent  TEXT,
                expires_at  TIMESTAMPTZ NOT NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions (token_hash);
            CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions (user_id);
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS user_sessions;");
    }
};
