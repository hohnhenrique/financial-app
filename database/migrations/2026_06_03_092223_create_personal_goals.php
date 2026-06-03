<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS personal_goals (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                priority_id   UUID REFERENCES priorities(id),
                title         VARCHAR(255) NOT NULL,
                description   TEXT,
                category      VARCHAR(50) NOT NULL DEFAULT 'outros',
                target_value  NUMERIC(10,2) NOT NULL DEFAULT 1,
                current_value NUMERIC(10,2) NOT NULL DEFAULT 0,
                unit          VARCHAR(30) NOT NULL DEFAULT '%',
                color         CHAR(7) NOT NULL DEFAULT '#3b82f6',
                icon          VARCHAR(50) NOT NULL DEFAULT 'target',
                deadline      DATE,
                status        VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX idx_personal_goals_user ON personal_goals(user_id);
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS personal_goals CASCADE");
    }
};
