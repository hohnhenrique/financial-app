<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS accounts (
                id                    BIGSERIAL PRIMARY KEY,
                user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name                  VARCHAR(100) NOT NULL,
                type                  VARCHAR(30) NOT NULL DEFAULT 'checking'
                                      CHECK (type IN ('checking','savings','wallet','investment','credit_card')),
                currency              CHAR(3) NOT NULL DEFAULT 'BRL',
                initial_balance_cents INTEGER NOT NULL DEFAULT 0,
                color                 CHAR(7) DEFAULT '#1B4F8A',
                is_hidden             BOOLEAN NOT NULL DEFAULT false,
                created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at            TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS idx_accounts_user
                ON accounts (user_id) WHERE deleted_at IS NULL;
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS accounts;");
    }
};
