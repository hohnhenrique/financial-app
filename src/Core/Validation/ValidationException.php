<?php

declare(strict_types=1);

namespace App\Core\Validation;

final class ValidationException extends \InvalidArgumentException
{
    public function __construct(
        private readonly array $errors,
        string $message = 'Dados inválidos',
    ) {
        parent::__construct($message);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function getFirstError(): string
    {
        return array_values($this->errors)[0] ?? $this->getMessage();
    }
}
