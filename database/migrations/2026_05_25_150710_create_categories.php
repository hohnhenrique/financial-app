<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS categories (
                id          BIGSERIAL PRIMARY KEY,
                user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
                name        VARCHAR(80) NOT NULL,
                type        VARCHAR(10) NOT NULL DEFAULT 'both'
                            CHECK (type IN ('income','expense','both')),
                color       CHAR(7) DEFAULT '#1B4F8A',
                icon        VARCHAR(60) DEFAULT 'circle',
                is_archived BOOLEAN NOT NULL DEFAULT false,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id);
        ");

        $pdo->exec("
            INSERT INTO categories (name, type, color, icon) VALUES
                ('Salario',         'income',  '#22c55e', 'wallet'),
                ('Freelance',       'income',  '#10b981', 'briefcase'),
                ('Investimentos',   'income',  '#3b82f6', 'trending-up'),
                ('Outros receita',  'income',  '#6b7280', 'plus-circle'),
                ('Alimentacao',     'expense', '#ef4444', 'fork-knife'),
                ('Moradia',         'expense', '#f97316', 'home'),
                ('Transporte',      'expense', '#eab308', 'car'),
                ('Saude',           'expense', '#ec4899', 'heart'),
                ('Educacao',        'expense', '#8b5cf6', 'book'),
                ('Lazer',           'expense', '#06b6d4', 'device-gamepad'),
                ('Roupas',          'expense', '#f43f5e', 'shirt'),
                ('Outros despesa',  'expense', '#6b7280', 'minus-circle')
            ON CONFLICT DO NOTHING;
        ");
    }

    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS categories;");
    }
};
