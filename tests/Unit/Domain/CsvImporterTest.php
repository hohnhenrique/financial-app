<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Import\CsvImporter;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;

final class CsvImporterTest extends TestCase
{
    // ── Rico ──────────────────────────────────────────────────────────────────

    #[Test]
    public function itParsesRicoFormat(): void
    {
        $csv = "Data;Estabelecimento;Portador;Valor;Parcela\n" .
               "03/12/2025;MP*MERCADOLIVRE;HENRIQUE;R\$ 73,90;7 de 10\n" .
               "05/01/2026;SUPERMERCADO;HENRIQUE;R\$ 100,00;-\n";

        $rows = CsvImporter::parse($csv, 'rico');

        $this->assertCount(2, $rows);
        $this->assertSame('2025-12-03',    $rows[0]->date);
        $this->assertSame('MP*MERCADOLIVRE [7 de 10]', $rows[0]->description);
        $this->assertSame(7390,            $rows[0]->amountCents);
        $this->assertSame('expense',       $rows[0]->type);
    }

    #[Test]
    public function itHandlesBomInRico(): void
    {
        // BOM UTF-8 no início do arquivo
        $csv = "\xEF\xBB\xBFData;Estabelecimento;Portador;Valor;Parcela\n" .
               "03/12/2025;MERCADO;HENRIQUE;R\$ 50,00;-\n";

        $rows = CsvImporter::parse($csv, 'rico');
        $this->assertCount(1, $rows);
        $this->assertSame(5000, $rows[0]->amountCents);
    }

    #[Test]
    public function itTreatsNegativeRicoValueAsIncome(): void
    {
        $csv = "Data;Estabelecimento;Portador;Valor;Parcela\n" .
               "01/06/2025;PAGAMENTO RECEBIDO;TITULAR;-1500,00;-\n";

        $rows = CsvImporter::parse($csv, 'rico');
        $this->assertCount(1, $rows);
        $this->assertSame('income', $rows[0]->type);
        $this->assertSame(150000,   $rows[0]->amountCents);
    }

    #[Test]
    public function itSkipsEmptyLinesInRico(): void
    {
        $csv = "Data;Estabelecimento;Portador;Valor;Parcela\n\n\n" .
               "03/12/2025;MERCADO;H;R\$ 50,00;-\n\n";

        $rows = CsvImporter::parse($csv, 'rico');
        $this->assertCount(1, $rows);
    }

    // ── Nubank ────────────────────────────────────────────────────────────────

    #[Test]
    public function itParsesNubankFormat(): void
    {
        $csv = "date,category,title,amount\n" .
               "2025-12-01,Restaurantes,iFood,85.90\n" .
               "2025-12-02,Supermercado,Carrefour,213.45\n";

        $rows = CsvImporter::parse($csv, 'nubank');
        $this->assertCount(2, $rows);
        $this->assertSame('2025-12-01', $rows[0]->date);
        $this->assertSame(8590,         $rows[0]->amountCents);
        $this->assertSame('expense',    $rows[0]->type);
    }

    // ── Genérico ──────────────────────────────────────────────────────────────

    #[Test]
    public function itParsesGenericFormat(): void
    {
        $csv = "Data;Descrição;Valor\n" .
               "15/05/2025;Salário;5000,00\n" .
               "20/05/2025;Aluguel;-1200,00\n";

        $rows = CsvImporter::parse($csv, 'generic');
        $this->assertCount(2, $rows);
    }

    // ── Encoding ──────────────────────────────────────────────────────────────

    #[Test]
    public function itNormalizesIso88591(): void
    {
        // Simula texto em ISO-8859-1 com caracteres especiais
        $csv = mb_convert_encoding(
            "Data;Estabelecimento;Portador;Valor;Parcela\n03/12/2025;Padaria Pão;H;R\$ 15,00;-\n",
            'ISO-8859-1', 'UTF-8'
        );

        $rows = CsvImporter::parse($csv, 'rico');
        $this->assertCount(1, $rows);
    }

    // ── Casos extremos ────────────────────────────────────────────────────────

    #[Test]
    public function itReturnsEmptyArrayForEmptyCsv(): void
    {
        $rows = CsvImporter::parse("Data;Estabelecimento;Portador;Valor;Parcela\n", 'rico');
        $this->assertEmpty($rows);
    }

    #[Test]
    public function itHandlesValueWithThousandSeparator(): void
    {
        $csv = "Data;Estabelecimento;Portador;Valor;Parcela\n" .
               "01/06/2025;LOJA;H;R\$ 1.234,56;-\n";

        $rows = CsvImporter::parse($csv, 'rico');
        $this->assertSame(123456, $rows[0]->amountCents);
    }
}
