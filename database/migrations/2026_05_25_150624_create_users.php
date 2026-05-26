<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id              BIGSERIAL PRIMARY KEY,
                name            VARCHAR(150) NOT NULL,
                email           VARCHAR(255) NOT NULL,
                password_hash   VARCHAR(255) NOT NULL,
                currency        CHAR(3) NOT NULL DEFAULT 'BRL',
                timezone        VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
                login_attempts  SMALLINT NOT NULL DEFAULT 0,
                locked_until    TIMESTAMPTZ,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at      TIMESTAMPTZ
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
                ON users (email) WHERE deleted_at IS NULL;
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS users;");
    }
};
