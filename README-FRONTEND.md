# 🖥️ Finance App — Frontend

Interface web do Finance App construída com **React 19 + TypeScript + Vite + Tailwind CSS**.

Consome a API REST do backend PHP via HTTP, com autenticação por sessão (cookie).

---

## 📋 Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20.x LTS ou superior |
| npm | 10.x |
| nvm (recomendado) | qualquer |

> O backend PHP deve estar rodando antes de iniciar o frontend.
> Veja o README principal para subir os containers Docker.

---

## 🚀 Instalação

### 1. Instale o Node.js (via nvm — recomendado)

```bash
# Instale o nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Instale a versão LTS atual
nvm install --lts
nvm use --lts

# Verifique
node --version   # v22.x ou v20.x
npm --version    # 10.x
```

### 2. Entre na pasta do frontend

```bash
cd frontend
```

### 3. Instale as dependências

```bash
npm install
```

---

## ▶️ Rodando em desenvolvimento

```bash
npm run dev
```

Abre em **http://localhost:5173**

O Vite faz proxy automático de `/api/*` para `http://localhost:3000` (onde está o PHP). Você não precisa configurar nada — basta ter os containers Docker rodando.

---

## 🏗️ Build para produção

```bash
npm run build
```

Gera os arquivos em `../public/app/` (dentro do projeto PHP). O PHP serve esses arquivos estáticos automaticamente via `SpaController` para qualquer rota que não seja `/api/*`.

Após o build, acesse pelo PHP direto em **http://localhost:3000** — sem precisar do servidor do Vite.

---

## 📁 Estrutura de pastas

```
frontend/src/
├── api/                  ← Clientes HTTP por recurso
│   ├── client.ts         ← Instância do Axios com interceptors
│   ├── auth.ts           ← login, register, logout, me
│   ├── transactions.ts   ← CRUD de movimentações
│   ├── accounts.ts       ← CRUD de contas
│   ├── categories.ts     ← CRUD de categorias
│   └── dashboard.ts      ← dados do dashboard
│
├── components/
│   ├── ui/               ← Componentes reutilizáveis (design system)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Card.tsx
│   │   ├── Alert.tsx
│   │   └── Pagination.tsx
│   └── layout/
│       ├── AppLayout.tsx  ← Layout protegido (sidebar + header)
│       └── Sidebar.tsx    ← Menu lateral com navegação
│
├── context/
│   ├── AuthContext.tsx    ← Estado global do usuário logado
│   └── ThemeContext.tsx   ← Dark/light mode persistido no localStorage
│
├── hooks/                ← Custom hooks por feature (React Query)
│   ├── useTransactions.ts
│   ├── useAccounts.ts
│   └── useDashboard.ts
│
├── pages/                ← Uma page por rota
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── AccountsPage.tsx
│   ├── CategoriesPage.tsx
│   ├── ProfilePage.tsx
│   └── AdminUsersPage.tsx
│
├── types/
│   └── index.ts          ← Interfaces TypeScript (User, Transaction, Account...)
│
├── utils/
│   ├── cn.ts             ← Utilitário para concatenar classes CSS
│   └── format.ts         ← formatMoney, formatDate, parseMoneyInput
│
├── App.tsx               ← Roteamento principal
├── main.tsx              ← Entry point
└── index.css             ← Tailwind base
```

---

## 🔄 Como funciona a lógica do frontend

### Fluxo de autenticação

```
1. App.tsx carrega → AuthProvider tenta GET /api/auth/me
2. Se retornar 200 → usuário logado, renderiza AppLayout
3. Se retornar 401 → redireciona para /login
4. Login/Register → POST /api/auth/login → salva usuário no AuthContext
5. Logout → POST /api/auth/logout → limpa AuthContext → redireciona /login
```

A sessão é mantida por **cookie HttpOnly** gerenciado pelo PHP + Redis. O React não armazena token — a autenticação é transparente via cookie em todas as requisições (Axios configurado com `withCredentials: true`).

### Fluxo de dados (React Query)

```
Page → custom hook (useTransactions) → React Query → Axios → API PHP → PostgreSQL
                ↓
          cache automático (30s stale)
          refetch em foco de janela
          invalidação após mutações (create/update/delete)
```

Exemplo de fluxo ao criar uma transação:

```
1. Usuário preenche o formulário e clica em Salvar
2. useMutation chama transactionsApi.create(data)
3. Axios faz POST /api/transactions com o JSON
4. PHP valida → salva no banco → retorna 201 com o objeto criado
5. React Query invalida a cache de /transactions
6. Lista recarrega automaticamente com o novo item
7. Toast de sucesso aparece
```

### Gerenciamento de estado

```
AuthContext    → usuário logado (global, persistido via cookie de sessão)
ThemeContext   → dark/light mode (global, persistido no localStorage)
React Query    → dados do servidor (cache, loading, error por query)
useState local → estado de formulários e UI local (modais, filtros)
```

### Proxy em desenvolvimento

```
Browser:5173  →  Vite Dev Server  →  PHP:3000
    ↓                 ↓
React (SPA)      /api/* → proxy → http://localhost:3000/api/*
                 /* → React Router (SPA)
```

Em produção, depois do `npm run build`:

```
Browser  →  Nginx:3000  →  PHP-FPM
    ↓
/api/*  →  PHP controllers
/*      →  SpaController → public/app/index.html → React Router
```

---

## 🧰 Tecnologias e por que cada uma

| Lib | Versão | Para que serve |
|---|---|---|
| React | 19 | UI declarativa com componentes |
| TypeScript | 5.x | Tipagem estática — pega erros em tempo de desenvolvimento |
| Vite | 6.x | Build tool ultrarrápido com HMR instantâneo |
| React Router | 6.x | Roteamento client-side (SPA) |
| TanStack Query | 5.x | Cache e sincronização de dados do servidor |
| Axios | 1.x | HTTP client com interceptors para auth/errors |
| Tailwind CSS | 3.x | Utility-first CSS — mesmo sistema visual do PHP anterior |
| Recharts | 2.x | Gráficos (barras, linhas, pizza) — mesmos do dashboard |
| Lucide React | — | Ícones SVG consistentes |

---

## 🛠️ Comandos disponíveis

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build de produção (gera em ../public/app/)
npm run build

# Preview do build de produção localmente
npm run preview

# Verificar tipos TypeScript
npx tsc --noEmit

# Lint
npm run lint
```

---

## 🌐 Variáveis de ambiente

O frontend não tem `.env` próprio em desenvolvimento — o proxy do Vite já aponta para `http://localhost:3000`.

Para build de produção em outro servidor, crie `frontend/.env.production`:

```env
VITE_API_URL=https://seu-dominio.com
```

E atualize `vite.config.ts` se necessário.

---

## 🔗 Relação com o Backend

O frontend consome exclusivamente a API REST do PHP:

| Método | Rota | O que faz |
|---|---|---|
| POST | /api/auth/login | Autenticar usuário |
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/logout | Encerrar sessão |
| GET | /api/auth/me | Usuário logado |
| GET | /api/dashboard | Dados do dashboard |
| GET | /api/transactions | Listar (paginado) |
| POST | /api/transactions | Criar |
| PUT | /api/transactions/:id | Editar |
| DELETE | /api/transactions/:id | Excluir |
| GET | /api/accounts | Listar contas |
| POST | /api/accounts | Criar conta |
| PUT | /api/accounts/:id | Editar |
| DELETE | /api/accounts/:id | Excluir |
| GET | /api/categories | Listar categorias |
| POST | /api/categories | Criar |
| PUT | /api/categories/:id | Editar |
| DELETE | /api/categories/:id | Excluir |
| GET | /api/profile | Ver perfil |
| PUT | /api/profile | Atualizar dados |
| PUT | /api/profile/password | Trocar senha |
| GET | /api/admin/users | Listar usuários (admin) |
| PUT | /api/admin/users/:id/role | Promover/rebaixar |
| DELETE | /api/admin/users/:id | Remover usuário |

Todas as respostas seguem o padrão:

```json
{
  "success": true,
  "message": "OK",
  "data": { ... }
}
```

---

## 📌 Observações

- O frontend **não** usa localStorage para autenticação — segurança é responsabilidade do cookie HttpOnly do PHP.
- Ao rodar `npm run build`, os arquivos gerados em `public/app/` devem ser commitados ou gerados no deploy.
- Em desenvolvimento, CORS está liberado para `localhost:5173` no `public/index.php` do PHP.
- O React Router usa `BrowserRouter` — o PHP precisa redirecionar rotas não-API para o `index.html` (já feito via `SpaController`).