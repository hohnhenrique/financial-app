<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS priorities (
                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                label      VARCHAR(50) NOT NULL,
                color      CHAR(7) NOT NULL DEFAULT '#94a3b8',
                level      SMALLINT NOT NULL DEFAULT 1,
                icon       VARCHAR(50) NOT NULL DEFAULT 'minus',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            INSERT INTO priorities (label, color, level, icon) VALUES
                ('Baixa',   '#94a3b8', 1, 'arrow-down'),
                ('Média',   '#60a5fa', 2, 'minus'),
                ('Alta',    '#f59e0b', 3, 'arrow-up'),
                ('Urgente', '#ef4444', 4, 'alert-triangle'),
                ('Crítica', '#7c3aed', 5, 'zap')
            ON CONFLICT DO NOTHING;
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS priorities CASCADE");
    }
};
