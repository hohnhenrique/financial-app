<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS transactions (
                id                     BIGSERIAL PRIMARY KEY,
                user_id                BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                account_id             BIGINT NOT NULL REFERENCES accounts(id),
                category_id            BIGINT NOT NULL REFERENCES categories(id),
                type                   VARCHAR(10) NOT NULL
                                       CHECK (type IN ('income','expense','transfer')),
                amount_cents           INTEGER NOT NULL CHECK (amount_cents > 0),
                description            VARCHAR(255) NOT NULL,
                notes                  TEXT,
                transaction_date       DATE NOT NULL,
                transfer_to_account_id BIGINT REFERENCES accounts(id),
                created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at             TIMESTAMPTZ
            );
            CREATE INDEX IF NOT EXISTS idx_txn_user_date
                ON transactions (user_id, transaction_date DESC) WHERE deleted_at IS NULL;
            CREATE INDEX IF NOT EXISTS idx_txn_type
                ON transactions (user_id, type) WHERE deleted_at IS NULL;
            CREATE INDEX IF NOT EXISTS idx_txn_account
                ON transactions (account_id) WHERE deleted_at IS NULL;
        ");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("DROP TABLE IF EXISTS transactions;");
    }
};
