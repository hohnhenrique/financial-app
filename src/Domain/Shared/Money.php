<?php

declare(strict_types=1);

namespace App\Domain\Shared;

final class Money
{
    private function __construct(
        private readonly int    $cents,
        private readonly string $currency,
    ) {}

    // ── Construtores ─────────────────────────────────────────────────────────

    public static function ofCents(int $cents, string $currency = 'BRL'): self
    {
        return new self($cents, strtoupper($currency));
    }

    /**
     * Cria a partir de string humana: "1.234,56" ou "1234.56"
     */
    public static function fromString(string $value, string $currency = 'BRL'): self
    {
        // Remove pontos de milhar e troca vírgula decimal por ponto
        $normalized = str_replace(['.', ','], ['', '.'], trim($value));

        if (!is_numeric($normalized)) {
            throw new \InvalidArgumentException("Valor monetário inválido: \"{$value}\"");
        }

        $cents = (int) round((float) $normalized * 100);

        if ($cents < 0) {
            throw new \InvalidArgumentException('O valor não pode ser negativo.');
        }

        return new self($cents, strtoupper($currency));
    }

    // ── Operações ─────────────────────────────────────────────────────────────

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);
        return new self($this->cents + $other->cents, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);
        return new self($this->cents - $other->cents, $this->currency);
    }

    public function multiply(float $factor): self
    {
        return new self((int) round($this->cents * $factor), $this->currency);
    }

    public function percentage(float $percent): self
    {
        return $this->multiply($percent / 100);
    }

    public function isZero(): bool     { return $this->cents === 0; }
    public function isPositive(): bool { return $this->cents > 0; }
    public function isNegative(): bool { return $this->cents < 0; }

    public function equals(self $other): bool
    {
        return $this->cents === $other->cents && $this->currency === $other->currency;
    }

    public function greaterThan(self $other): bool
    {
        $this->assertSameCurrency($other);
        return $this->cents > $other->cents;
    }

    public function lessThan(self $other): bool
    {
        $this->assertSameCurrency($other);
        return $this->cents < $other->cents;
    }

    // ── Acesso ───────────────────────────────────────────────────────────────

    public function cents(): int       { return $this->cents; }
    public function currency(): string { return $this->currency; }

    public function toFloat(): float   { return $this->cents / 100; }

    // ── Formatação ────────────────────────────────────────────────────────────

    public function format(): string
    {
        return match ($this->currency) {
            'BRL'   => 'R$ ' . number_format($this->toFloat(), 2, ',', '.'),
            'USD'   => '$ '  . number_format($this->toFloat(), 2, '.', ','),
            'EUR'   => '€ '  . number_format($this->toFloat(), 2, ',', '.'),
            default => $this->currency . ' ' . number_format($this->toFloat(), 2, '.', ','),
        };
    }

    public function __toString(): string
    {
        return $this->format();
    }

    // ── Privados ──────────────────────────────────────────────────────────────

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException(
                "Moedas diferentes: {$this->currency} e {$other->currency}"
            );
        }
    }
}
