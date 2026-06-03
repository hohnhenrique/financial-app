<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS personal_habits (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                priority_id    UUID REFERENCES priorities(id),
                title          VARCHAR(255) NOT NULL,
                description    TEXT,
                category       VARCHAR(50) NOT NULL DEFAULT 'saude',
                frequency      VARCHAR(20) NOT NULL DEFAULT 'daily',
                target_count   SMALLINT NOT NULL DEFAULT 1,
                color          CHAR(7) NOT NULL DEFAULT '#10b981',
                icon           VARCHAR(50) NOT NULL DEFAULT 'check-circle',
                is_active      BOOLEAN NOT NULL DEFAULT true,
                created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS personal_habit_logs (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                habit_id       UUID NOT NULL REFERENCES personal_habits(id) ON DELETE CASCADE,
                user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                logged_date    DATE NOT NULL,
                count          SMALLINT NOT NULL DEFAULT 1,
                notes          TEXT,
                created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE(habit_id, logged_date)
            );
            CREATE INDEX idx_habit_logs_habit ON personal_habit_logs(habit_id, logged_date DESC);
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("
            DROP TABLE IF EXISTS personal_habit_logs CASCADE;
            DROP TABLE IF EXISTS personal_habits CASCADE;
        ");
    }
};
