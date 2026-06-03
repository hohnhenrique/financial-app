<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS category_budgets (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                year_month   CHAR(7) NOT NULL,
                budget_cents INTEGER NOT NULL DEFAULT 0,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (user_id, category_id, year_month)
            );
            CREATE INDEX idx_cat_budgets_user ON category_budgets(user_id, year_month);
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS category_budgets CASCADE");
    }
};
