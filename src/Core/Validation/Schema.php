<?php

declare(strict_types=1);

namespace App\Core\Validation;

/**
 * Validador de schema fluente — estilo Zod para PHP.
 *
 * Exemplos:
 *   Schema::string()->min(3)->max(255)->required()
 *   Schema::number()->positive()->required()
 *   Schema::email()->required()
 *   Schema::object(['name' => Schema::string()->required()])
 *   Schema::array(Schema::string())->min(1)
 */
final class Schema
{
    private string  $type       = 'string';
    private bool    $isRequired = false;
    private bool    $nullable   = false;
    private array   $rules      = [];
    private array   $fields     = [];  // para object
    private ?Schema $itemSchema = null; // para array

    private function __construct(string $type)
    {
        $this->type = $type;
    }

    // ── Tipos ─────────────────────────────────────────────────────────────────

    public static function string(): self  { return new self('string'); }
    public static function number(): self  { return new self('number'); }
    public static function integer(): self { return new self('integer'); }
    public static function bool(): self    { return new self('bool'); }
    public static function email(): self
    {
        $s = new self('string');
        return $s->addRule('email', true, 'deve ser um e-mail válido');
    }
    public static function uuid(): self
    {
        $s = new self('string');
        return $s->addRule('uuid', true, 'deve ser um UUID válido');
    }
    public static function date(): self
    {
        $s = new self('string');
        return $s->addRule('date', true, 'deve ser uma data válida (YYYY-MM-DD)');
    }
    public static function object(array $fields): self
    {
        $s = new self('object');
        $s->fields = $fields;
        return $s;
    }
    public static function array(self $itemSchema): self
    {
        $s = new self('array');
        $s->itemSchema = $itemSchema;
        return $s;
    }
    public static function enum(array $values): self
    {
        $s = new self('enum');
        return $s->addRule('enum', $values, 'deve ser um de: ' . implode(', ', $values));
    }

    // ── Modificadores ─────────────────────────────────────────────────────────

    public function required(): self { $this->isRequired = true; return $this; }
    public function optional(): self { $this->isRequired = false; return $this; }
    public function nullable(): self { $this->nullable = true; return $this; }

    public function min(int|float $n): self
    {
        return $this->addRule('min', $n,
            $this->type === 'string' ? "deve ter pelo menos {$n} caracteres" : "deve ser >= {$n}"
        );
    }

    public function max(int|float $n): self
    {
        return $this->addRule('max', $n,
            $this->type === 'string' ? "deve ter no máximo {$n} caracteres" : "deve ser <= {$n}"
        );
    }

    public function positive(): self
    {
        return $this->addRule('positive', true, 'deve ser um número positivo');
    }

    public function regex(string $pattern, string $message = 'formato inválido'): self
    {
        return $this->addRule('regex', $pattern, $message);
    }

    // ── Validação ─────────────────────────────────────────────────────────────

    /**
     * Valida um valor isolado.
     * Retorna null se válido, string de erro se inválido.
     */
    public function validate(mixed $value, string $field = 'campo'): ?string
    {
        // Verifica se está presente
        if ($value === null || $value === '') {
            return $this->isRequired ? "{$field} é obrigatório" : null;
        }

        if ($this->nullable && $value === null) return null;

        // Valida tipo
        $typeError = $this->validateType($value, $field);
        if ($typeError) return $typeError;

        // Valida regras
        foreach ($this->rules as [$rule, $param, $message]) {
            $error = $this->applyRule($rule, $param, $value, $field, $message);
            if ($error) return $error;
        }

        return null;
    }

    /**
     * Valida um array de dados contra um schema de objeto.
     * Retorna array de erros ['campo' => 'mensagem'].
     */
    public static function validateObject(array $fields, array $data): array
    {
        $errors = [];

        foreach ($fields as $fieldName => $schema) {
            $value = $data[$fieldName] ?? null;
            $error = $schema->validate($value, $fieldName);
            if ($error) {
                $errors[$fieldName] = $error;
            }
        }

        return $errors;
    }

    /**
     * Lança exceção se houver erros de validação.
     */
    public static function assert(array $fields, array $data): void
    {
        $errors = self::validateObject($fields, $data);

        if (!empty($errors)) {
            $messages = implode('; ', array_map(
                fn($field, $msg) => "{$field}: {$msg}",
                array_keys($errors),
                $errors
            ));
            throw new ValidationException($errors, "Dados inválidos: {$messages}");
        }
    }

    // ── Privados ──────────────────────────────────────────────────────────────

    private function addRule(string $rule, mixed $param, string $message): self
    {
        $this->rules[] = [$rule, $param, $message];
        return $this;
    }

    private function validateType(mixed $value, string $field): ?string
    {
        return match ($this->type) {
            'string'  => !is_string($value) ? "{$field} deve ser texto" : null,
            'number'  => !is_numeric($value) ? "{$field} deve ser um número" : null,
            'integer' => !is_numeric($value) || (int)$value != $value ? "{$field} deve ser inteiro" : null,
            'bool'    => !in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true)
                            ? "{$field} deve ser verdadeiro ou falso" : null,
            'object'  => !is_array($value) ? "{$field} deve ser um objeto" : null,
            'array'   => !is_array($value) ? "{$field} deve ser um array" : null,
            default   => null,
        };
    }

    private function applyRule(string $rule, mixed $param, mixed $value, string $field, string $message): ?string
    {
        $ok = match ($rule) {
            'min'      => is_string($value) ? mb_strlen($value) >= $param : $value >= $param,
            'max'      => is_string($value) ? mb_strlen($value) <= $param : $value <= $param,
            'positive' => is_numeric($value) && $value > 0,
            'email'    => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
            'uuid'     => (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value),
            'date'     => (bool) \DateTime::createFromFormat('Y-m-d', $value),
            'regex'    => (bool) preg_match($param, $value),
            'enum'     => in_array($value, $param, true),
            default    => true,
        };

        return $ok ? null : "{$field} {$message}";
    }
}
