<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS personal_tasks (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                priority_id  UUID REFERENCES priorities(id),
                title        VARCHAR(255) NOT NULL,
                description  TEXT,
                category     VARCHAR(50) NOT NULL DEFAULT 'pessoal',
                status       VARCHAR(20) NOT NULL DEFAULT 'todo',
                due_date     DATE,
                completed_at TIMESTAMPTZ,
                color        CHAR(7) NOT NULL DEFAULT '#6366f1',
                tags         TEXT,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX idx_personal_tasks_user ON personal_tasks(user_id, status);
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS personal_tasks CASCADE");
    }
};
