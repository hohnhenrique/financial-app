<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS monthly_goals (
                id              BIGSERIAL PRIMARY KEY,
                user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                year_month      CHAR(7) NOT NULL,
                income_goal     INTEGER NOT NULL DEFAULT 0,
                expense_goal    INTEGER NOT NULL DEFAULT 0,
                notes           TEXT,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (user_id, year_month)
            );
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS monthly_goals;");
    }
};
