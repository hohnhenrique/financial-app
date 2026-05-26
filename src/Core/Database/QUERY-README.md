# QueryBuilder - Exemplos de Uso

## Antes (PDO puro)

```php
$pdo->prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL')->execute([$email]);
```

## Agora (QueryBuilder)

```php
use App\Core\Database\QueryBuilder;

$user = QueryBuilder::table('users')
    ->where('email', $email)
    ->whereNull('deleted_at')
    ->first();
```

## Paginado

```php
$rows = QueryBuilder::table('transactions')
    ->where('user_id', $userId)
    ->whereNull('deleted_at')
    ->orderBy('transaction_date', 'DESC')
    ->paginate($page, $perPage)
    ->get();
```

## Contar

```php
$total = QueryBuilder::table('transactions')
    ->where('user_id', $userId)
    ->whereNull('deleted_at')
    ->count();
```

## Insert

```php
$id = QueryBuilder::table('users')
    ->insert([
        'name' => $name,
        'email' => $email,
        'password_hash' => $hash
    ]);
```

## Update

```php
QueryBuilder::table('users')
    ->where('id', $userId)
    ->update([
        'name' => $name,
        'updated_at' => date('Y-m-d H:i:s')
    ]);
```

## Soft delete

```php
QueryBuilder::table('transactions')
    ->where('id', $id)
    ->where('user_id', $userId)
    ->softDelete();
```