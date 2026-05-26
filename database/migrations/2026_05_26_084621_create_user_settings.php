<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS user_settings (
                id                  BIGSERIAL PRIMARY KEY,
                user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_lifetime    INTEGER NOT NULL DEFAULT 480,
                primary_color       CHAR(7) NOT NULL DEFAULT '#1B4F8A',
                sidebar_color_from  CHAR(7) NOT NULL DEFAULT '#0f172a',
                sidebar_color_to    CHAR(7) NOT NULL DEFAULT '#1e293b',
                created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS user_settings;");
    }
};
