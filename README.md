# 💰 Financial Control

Sistema de controle de finanças pessoais desenvolvido em **PHP 8.4 puro**, sem frameworks, com arquitetura em camadas (MVC + Service + Repository), Docker e PostgreSQL.

---

## 📋 Pré-requisitos

| Ferramenta | Versão mínima | Download |
|---|---|---|
| Docker Engine | 26.x | https://docs.docker.com/engine/install/ |
| Docker Compose | v2.x | Incluído no Docker Engine |
| Git | qualquer | https://git-scm.com |
| DBeaver (opcional) | CE | https://dbeaver.io/download/ |

---

## 🚀 Primeira execução

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/financial-control.git
cd financial-control
```

### 2. Copie o arquivo de ambiente

```bash
cp .env.example .env
```

> Edite o `.env` se precisar mudar senhas ou portas.

### 3. Suba os containers

```bash
docker compose up -d --build
```

A primeira vez leva alguns minutos - ele baixa as imagens e compila o PHP 8.4.

### 4. Instale o Composer dentro do container

```bash
docker compose exec php sh -c "curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer"
```

### 5. Gere o autoload

```bash
docker compose exec php composer dump-autoload
```

### 6. Rode as migrations

```bash
docker compose exec php php bin/migrate.php
```

### 7. Acesse a aplicação

| Serviço | URL |
|---|---|
| Aplicação | http://localhost:3000 |
| pgAdmin | http://localhost:8081 |

---

## 🐳 Containers

| Container | Imagem | Porta externa |
|---|---|--|
| nginx | nginx:alpine | 3000 |
| php | php:8.4-fpm-alpine (custom) |  |
| postgres | postgres:16-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| pgadmin | dpage/pgadmin4 | 8081 |

---

## 🗄️ Banco de dados

### Credenciais PostgreSQL

| Campo | Valor |
|---|---|
| Host | `localhost` (externo) / `postgres` (interno Docker) |
| Porta | `5432` |
| Banco | `finances` |
| Usuário | `app` |
| Senha | `secret123` |

### Conectar via terminal (psql)

```bash
docker compose exec postgres psql -U app -d finances
```

Comandos úteis dentro do psql:

```sql
\dt          -- lista todas as tabelas
\d nome      -- descreve uma tabela
\q           -- sai
```

### Conectar via DBeaver

1. Abra o DBeaver
2. Clique em **Nova Conexão** → selecione **PostgreSQL**
3. Preencha:
  - Host: `localhost`
  - Port: `5432`
  - Database: `finances`
  - Username: `app`
  - Password: `secret123`
4. Clique em **Test Connection** → **Finish**

### pgAdmin (interface web)

Acesse http://localhost:8081

- Email: `admin@finance.com`
- Senha: `admin123`

Para registrar o servidor no pgAdmin:
- Host: `postgres`
- Port: `5432`
- Database: `finances`
- Username: `app`
- Password: `secret123`

---

## 🛠️ Comandos do dia a dia

```bash
# Subir containers
docker compose up -d

# Parar containers
docker compose down

# Ver logs em tempo real
docker compose logs -f

# Logs só do PHP
docker compose logs -f php

# Abrir terminal no container PHP
docker compose exec php sh

# Rodar migrations
docker compose exec php php bin/migrate.php

# Popular banco com dados de exemplo
docker compose exec php php bin/seed.php

# Regenerar autoload após criar novas classes
docker compose exec php composer dump-autoload

# Reiniciar só o PHP (após mudanças no Dockerfile)
docker compose up -d --build php

# Ver status dos containers
docker compose ps

# Ver status das migrations
docker compose exec php php bin/migrate.php status

# Rodar migrations pendentes
docker compose exec php php bin/migrate.php up

# Reverter última migration
docker compose exec php php bin/migrate.php rollback

# Reverter últimas N migrations
docker compose exec php php bin/migrate.php rollback 3

# Resetar banco completo
docker compose exec php php bin/migrate.php reset
```

---

## 📁 Estrutura do projeto

```
financial-control/
├── docker/
│   ├── nginx/default.conf     ← Configuração do Nginx
│   └── php/
│       ├── Dockerfile         ← PHP 8.4-FPM + pdo_pgsql + redis
│       └── php.ini
├── public/                    ← Document root (único diretório público)
│   ├── index.php              ← Front controller
│   └── assets/
├── src/
│   ├── Core/                  ← Infraestrutura (Container, Router, Request...)
│   ├── Domain/                ← Regras de negócio (Services, Entities, Interfaces)
│   ├── Infrastructure/        ← Implementações PDO e Redis
│   ├── Http/                  ← Controllers e Validators
│   └── Views/                 ← Templates PHP
├── config/
│   ├── routes.php             ← Todas as rotas da aplicação
│   └── bindings.php           ← Mapa de interfaces → implementações (DI)
├── database/
│   ├── migrations/            ← Migrations numeradas (001_, 002_...)
│   └── seeds/                 ← Dados de exemplo para dev
├── bin/
│   ├── migrate.php
│   └── seed.php
├── storage/
│   ├── logs/                  ← Logs de aplicação e erros
│   └── uploads/               ← Comprovantes de transações
├── tests/
├── docker-compose.yml
├── composer.json
├── .env                       ← Nunca versionar
├── .env.example               ← Versionar este
└── README.md
```

---

## 🔐 Variáveis de ambiente (`.env`)

```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:3000
APP_KEY=gere-com-openssl-rand-hex-32

DB_HOST=postgres
DB_PORT=5432
DB_NAME=finances
DB_USER=app
DB_PASS=secret123

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PREFIX=finance:
SESSION_LIFETIME=480

UPLOAD_MAX_SIZE=5120
UPLOAD_PATH=/var/www/html/storage/uploads
```

> Para gerar uma APP_KEY segura:
> ```bash
> openssl rand -hex 32
> ```

---

## ⚙️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Linguagem | PHP 8.4 |
| Banco de dados | PostgreSQL 16 |
| Cache / Sessão | Redis 7 |
| Servidor web | Nginx (alpine) |
| Containerização | Docker + Compose |
| Frontend | Tailwind CSS + Alpine.js + Chart.js |
| Arquitetura | MVC + Service Layer + Repository Pattern |
| DI Container | Implementação própria (sem framework) |

---

## 📌 Observações

- O arquivo `.env` **nunca deve ser versionado** — está no `.gitignore`.
- Sempre use `.env.example` como template ao configurar em uma nova máquina.
- Todos os comandos PHP devem ser rodados **dentro do container**: `docker compose exec php ...`
- O volume `pgdata` persiste os dados do banco mesmo após `docker compose down`. Para resetar o banco: `docker compose down -v`.