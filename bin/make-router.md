# Gerador Automático de Rotas e Controllers

Este projeto possui um gerador automático de arquivos de rotas e controllers para agilizar a criação de endpoints da API.

---

# Localização do arquivo

O script está localizado em:

```bash
bin/make-router.php
```

---

# Como executar

No terminal, execute:

```bash
php bin/make-router.php NomeDaRota
```

Exemplo:

```bash
php bin/make-router.php Metas
```

---

# O que o comando faz

Ao executar o comando, o sistema:

1. Cria automaticamente um arquivo de rota em:

```bash
src/Http/Routes/MetasRoutes.php
```

2. Cria automaticamente um controller em:

```bash
src/Http/Controllers/Api/MetasController.php
```

3. Cria a classe da rota:

```php
final class MetasRoutes
```

4. Cria a classe do controller:

```php
final class MetasController extends ApiController
```

5. Adiciona automaticamente o import no arquivo:

```bash
config/routes.php
```

Exemplo:

```php
use App\Http\Routes\MetasRoutes;
```

6. Registra automaticamente a rota no sistema:

```php
MetasRoutes::register($router);
```

---

# Estrutura da rota gerada

O arquivo de rota possuirá automaticamente os 5 endpoints REST padrão:

```php
$router->get('/api/metas',         [MetasController::class, 'index']);
$router->post('/api/metas',        [MetasController::class, 'store']);
$router->get('/api/metas/{id}',    [MetasController::class, 'show']);
$router->put('/api/metas/{id}',    [MetasController::class, 'update']);
$router->delete('/api/metas/{id}', [MetasController::class, 'delete']);
```

---

# Estrutura do controller gerado

O controller será criado automaticamente contendo os 5 métodos básicos:

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

final class MetasController extends ApiController
{
    public function index(): string
    {

    }

    public function store(): string
    {

    }

    public function show(string $id): string
    {

    }

    public function update(string $id): string
    {

    }

    public function delete(string $id): string
    {

    }
}
```

---

# Convenções utilizadas

## Nome da classe da rota

Se o comando for:

```bash
php bin/make-router.php Metas
```

Será gerado:

```php
MetasRoutes
```

---

## Nome do controller

Automaticamente será utilizado:

```php
MetasController
```

---

## Prefixo da rota

Automaticamente convertido para minúsculo:

```bash
/api/metas
```

---

# Exemplo completo

## Comando

```bash
php bin/make-router.php Usuarios
```

---

## Arquivos criados

### Rota

```bash
src/Http/Routes/UsuariosRoutes.php
```

### Controller

```bash
src/Http/Controllers/Api/UsuariosController.php
```

---

## Classe da rota gerada

```php
final class UsuariosRoutes
```

---

## Classe do controller gerada

```php
final class UsuariosController extends ApiController
```

---

## Endpoints gerados

```bash
GET     /api/usuarios
POST    /api/usuarios
GET     /api/usuarios/{id}
PUT     /api/usuarios/{id}
DELETE  /api/usuarios/{id}
```

---

# Observações

- O script não sobrescreve arquivos existentes.
- Caso o arquivo de rota já exista, será exibida uma mensagem de erro.
- Caso o controller já exista, será exibida uma mensagem de erro.
- O registro da rota é inserido automaticamente abaixo da última chamada existente no `config/routes.php`.

---

# Fluxo recomendado

1. Criar a rota e controller:

```bash
php bin/make-router.php Produtos
```

2. Implementar as regras de negócio no controller:

```php
index()
store()
show()
update()
delete()
```

3. Criar services, DTOs e repositories necessários.

4. Utilizar normalmente na API.