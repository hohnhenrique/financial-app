<?php

declare(strict_types=1);

namespace Tests\Unit\Core;

use App\Core\Validation\Schema;
use App\Core\Validation\ValidationException;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;

final class SchemaValidationTest extends TestCase
{
    #[Test]
    public function itValidatesRequiredField(): void
    {
        $errors = Schema::validateObject(
            ['name' => Schema::string()->required()],
            ['name' => '']
        );
        $this->assertArrayHasKey('name', $errors);
    }

    #[Test]
    public function itPassesValidData(): void
    {
        $errors = Schema::validateObject([
            'email'    => Schema::email()->required(),
            'password' => Schema::string()->min(8)->required(),
        ], [
            'email'    => 'user@example.com',
            'password' => 'senha123',
        ]);
        $this->assertEmpty($errors);
    }

    #[Test]
    public function itValidatesEmail(): void
    {
        $errors = Schema::validateObject(
            ['email' => Schema::email()->required()],
            ['email' => 'not-an-email']
        );
        $this->assertArrayHasKey('email', $errors);
    }

    #[Test]
    public function itValidatesMinLength(): void
    {
        $errors = Schema::validateObject(
            ['name' => Schema::string()->min(3)->required()],
            ['name' => 'ab']
        );
        $this->assertArrayHasKey('name', $errors);
    }

    #[Test]
    public function itValidatesEnum(): void
    {
        $errors = Schema::validateObject(
            ['type' => Schema::enum(['income', 'expense'])->required()],
            ['type' => 'invalid']
        );
        $this->assertArrayHasKey('type', $errors);
    }

    #[Test]
    public function itThrowsValidationException(): void
    {
        $this->expectException(ValidationException::class);
        Schema::assert(
            ['email' => Schema::email()->required()],
            ['email' => 'invalid']
        );
    }

    #[Test]
    public function itAllowsOptionalEmptyFields(): void
    {
        $errors = Schema::validateObject(
            ['notes' => Schema::string()->optional()],
            ['notes' => '']
        );
        $this->assertEmpty($errors);
    }
}
