<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'))");
    }
    public function down(PDO $pdo): void {
        $pdo->exec("ALTER TABLE users DROP COLUMN IF EXISTS role");
    }
};
