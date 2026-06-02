<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Shared\Money;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;

final class MoneyTest extends TestCase
{
    // ── Construção ────────────────────────────────────────────────────────────

    #[Test]
    public function itCreatesFromCents(): void
    {
        $money = Money::ofCents(4000);
        $this->assertSame(4000, $money->cents());
    }

    #[Test]
    #[DataProvider('validStrings')]
    public function itParsesValidStrings(string $input, int $expectedCents): void
    {
        $money = Money::fromString($input);
        $this->assertSame($expectedCents, $money->cents(), "Input: {$input}");
    }

    public static function validStrings(): array
    {
        return [
            'BR simples'          => ['73,90',       7390],
            'BR com milhar'       => ['1.234,56',   123456],
            'BR valor alto'       => ['10.000,00', 1000000],
            'US format'           => ['400.00',      40000],
            'inteiro'             => ['400',          40000],
            'com R$'              => ['R$ 73,90',     7390],
            'com R$ e espaço'     => ['R$  1.234,56', 123456],
            'zero'                => ['0,00',             0],
            'centavos'            => ['0,01',             1],
        ];
    }

    #[Test]
    public function itRejectsInvalidStrings(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Money::fromString('abc');
    }

    #[Test]
    public function itRejectsNegativeValues(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Money::fromString('-100');
    }

    // ── Operações ─────────────────────────────────────────────────────────────

    #[Test]
    public function itAdds(): void
    {
        $a = Money::ofCents(1000);
        $b = Money::ofCents(500);
        $this->assertSame(1500, $a->add($b)->cents());
    }

    #[Test]
    public function itSubtracts(): void
    {
        $a = Money::ofCents(1000);
        $b = Money::ofCents(300);
        $this->assertSame(700, $a->subtract($b)->cents());
    }

    #[Test]
    public function itMultiplies(): void
    {
        $money = Money::ofCents(1000);
        $this->assertSame(1500, $money->multiply(1.5)->cents());
    }

    #[Test]
    public function itCalculatesPercentage(): void
    {
        $money = Money::ofCents(10000); // R$ 100,00
        $this->assertSame(2000, $money->percentage(20)->cents()); // 20% = R$ 20,00
    }

    #[Test]
    public function itThrowsOnDifferentCurrencies(): void
    {
        $brl = Money::ofCents(1000, 'BRL');
        $usd = Money::ofCents(1000, 'USD');
        $this->expectException(\InvalidArgumentException::class);
        $brl->add($usd);
    }

    // ── Comparação ────────────────────────────────────────────────────────────

    #[Test]
    public function itComparesEquality(): void
    {
        $this->assertTrue(Money::ofCents(500)->equals(Money::ofCents(500)));
        $this->assertFalse(Money::ofCents(500)->equals(Money::ofCents(501)));
    }

    #[Test]
    public function itComparesGreaterThan(): void
    {
        $this->assertTrue(Money::ofCents(600)->greaterThan(Money::ofCents(500)));
        $this->assertFalse(Money::ofCents(400)->greaterThan(Money::ofCents(500)));
    }

    // ── Formatação ────────────────────────────────────────────────────────────

    #[Test]
    public function itFormatsBRL(): void
    {
        $this->assertSame('R$ 1.234,56', Money::ofCents(123456)->format());
    }

    #[Test]
    public function itFormatsZero(): void
    {
        $this->assertSame('R$ 0,00', Money::ofCents(0)->format());
    }

    #[Test]
    public function zeroIsZero(): void
    {
        $this->assertTrue(Money::ofCents(0)->isZero());
        $this->assertFalse(Money::ofCents(1)->isZero());
    }
}
