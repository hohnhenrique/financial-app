<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT true,
                ADD COLUMN IF NOT EXISTS phone        VARCHAR(30),
                ADD COLUMN IF NOT EXISTS birth_date   DATE,
                ADD COLUMN IF NOT EXISTS bio          TEXT,
                ADD COLUMN IF NOT EXISTS timezone     VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
                ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

            CREATE TABLE IF NOT EXISTS invite_tokens (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token       VARCHAR(64) NOT NULL UNIQUE,
                created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                used_by     UUID REFERENCES users(id) ON DELETE SET NULL,
                note        VARCHAR(255),
                expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
                used_at     TIMESTAMPTZ,
                is_active   BOOLEAN NOT NULL DEFAULT true,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("
            DROP TABLE IF EXISTS invite_tokens;
            ALTER TABLE users
                DROP COLUMN IF EXISTS is_active,
                DROP COLUMN IF EXISTS phone,
                DROP COLUMN IF EXISTS birth_date,
                DROP COLUMN IF EXISTS bio,
                DROP COLUMN IF EXISTS timezone,
                DROP COLUMN IF EXISTS last_login_at;
        ");
    }
};
