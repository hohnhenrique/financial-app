# Migrations

Este diretorio guarda as migrations do banco de dados em `database/migrations`.
Os seeders ficam em `database/seeders`.

## Criar uma migration

Use o comando:

```bash
php bin/make-migration.php nome_da_migration
```

Exemplos:

```bash
php bin/make-migration.php create_budgets
php bin/make-migration.php add due date to transactions
```

O sistema cria o arquivo automaticamente com o proximo numero sequencial.

Se a ultima migration for:

```text
005_create_user_sessions.php
```

O comando:

```bash
php bin/make-migration.php create_budgets
```

vai criar:

```text
database/migrations/006_create_budgets.php
```

## Estrutura padrao

Cada migration deve retornar uma classe anonima com os metodos `up` e `down`:

```php
<?php
return new class {
    public function up(PDO $pdo): void {
        $pdo->exec("
            -- Alteracoes que serao aplicadas no banco.
        ");
    }

    public function down(PDO $pdo): void {
        $pdo->exec("
            -- Alteracoes para desfazer a migration.
        ");
    }
};
```

Use `up` para aplicar a alteracao e `down` para desfazer.

## Executar migrations pendentes

```bash
php bin/migrate.php up
```

Esse comando executa todas as migrations ainda nao registradas na tabela `migrations`.

## Ver status

```bash
php bin/migrate.php status
```

Mostra quais migrations ja foram executadas e quais ainda estao pendentes.

## Reverter a ultima migration

```bash
php bin/migrate.php rollback
```

## Reverter varias migrations

```bash
php bin/migrate.php rollback 3
```

Esse exemplo reverte as ultimas 3 migrations executadas.

## Resetar todas as migrations

```bash
php bin/migrate.php reset
```

Esse comando executa o `down` de todas as migrations registradas, da mais recente para a mais antiga.

Use com cuidado, porque ele pode apagar tabelas e dados dependendo do conteudo dos metodos `down`.

## Fluxo recomendado

1. Crie a migration:

```bash
php bin/make-migration.php nome_da_migration
```

2. Edite o arquivo criado em `database/migrations`.

3. Execute:

```bash
php bin/migrate.php up
```

4. Confira:

```bash
php bin/migrate.php status
```

# Seeders

Seeders inserem dados iniciais ou dados de exemplo no banco.

## Criar um seeder

Use o comando:

```bash
php bin/make-seeder.php nome_do_seeder
```

Exemplos:

```bash
php bin/make-seeder.php demo_user
php bin/make-seeder.php default categories
```

O sistema cria o arquivo automaticamente com o proximo numero sequencial.

Se o ultimo seeder for:

```text
001_demo_user.php
```

O comando:

```bash
php bin/make-seeder.php default_accounts
```

vai criar:

```text
database/seeders/002_default_accounts.php
```

## Estrutura padrao

Cada seeder deve retornar uma classe anonima com o metodo `run`:

```php
<?php
return new class {
    public function run(PDO $pdo): void {
        // Insira aqui os dados iniciais.
    }
};
```

## Executar seeders pendentes

```bash
php bin/seed.php run
```

Esse comando executa todos os seeders ainda nao registrados na tabela `seeders`.

No Docker, use:

```bash
docker compose exec php php bin/seed.php run
```

## Ver status dos seeders

```bash
php bin/seed.php status
```

No Docker:

```bash
docker compose exec php php bin/seed.php status
```

## Limpar historico dos seeders

```bash
php bin/seed.php forget
```

Esse comando apaga apenas os registros da tabela `seeders`. Ele nao desfaz os dados inseridos.

Use com cuidado: depois disso, os seeders podem rodar novamente. Por isso, prefira escrever seeders idempotentes, ou seja, que verificam se o dado ja existe antes de inserir.

## Seeder de exemplo

O projeto ja inclui:

```text
database/seeders/001_demo_user.php
```

Ele cria um usuario de exemplo, se ainda nao existir:

```text
E-mail: demo@finance.com
Senha: 12345678
```

Tambem cria a conta `Conta Demo` para esse usuario, se ela ainda nao existir.
