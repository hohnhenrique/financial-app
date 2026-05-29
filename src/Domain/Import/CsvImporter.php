<?php

declare(strict_types=1);

namespace App\Domain\Import;

use App\Domain\Import\BankParser\InterParser;

final class CsvImporter
{
    public const BANKS = [
        'rico'     => 'Rico — Cartão de Crédito',
        'inter'    => 'Banco Inter — Conta / Cartão',
        'nubank'   => 'Nubank — Cartão / Conta',
        'itau'     => 'Itaú — Conta Corrente',
        'bradesco' => 'Bradesco — Conta Corrente',
        'generic'  => 'Genérico (CSV padrão)',
    ];

    /** @return ImportedTransaction[] */
    public static function parse(string $content, string $bank): array
    {
        // Remove BOM e normaliza encoding
        $content = self::normalizeEncoding($content);

        return match ($bank) {
            'rico'     => self::parseRico($content),
            'inter'    => InterParser::parse($content),
            'nubank'   => self::parseNubank($content),
            'itau'     => self::parseItau($content),
            'bradesco' => self::parseBradesco($content),
            default    => self::parseGeneric($content),
        };
    }

    /**
     * Rico Cartão de Crédito
     * Formato: Data;Estabelecimento;Portador;Valor;Parcela
     * Exemplo: 03/12/2025;MP*MERCADOLIVRE;HENRIQUE HOHN;R$ 73,90;7 de 10
     * Valores positivos = despesa, negativos = pagamento/crédito
     */
    private static function parseRico(string $content): array
    {
        $rows   = self::csvToArray($content, ';');
        $result = [];
        $first  = true;

        foreach ($rows as $row) {
            if ($first) { $first = false; continue; }

            // Garante ao menos 4 colunas
            if (count($row) < 4) continue;

            $rawDate  = trim($row[0] ?? '');
            $desc     = trim($row[1] ?? '');
            $rawValue = trim($row[3] ?? '');
            $parcela  = trim($row[4] ?? '');

            if ($rawDate === '' || $desc === '' || $rawValue === '') continue;

            $date  = self::parseDate($rawDate);
            $cents = self::parseMoney($rawValue);

            if ($date === null || $cents === null) continue;

            // Enriquece descrição com parcela
            if ($parcela !== '' && $parcela !== '-') {
                $desc .= " [{$parcela}]";
            }

            // Rico: positivo = compra (despesa), negativo = pagamento (receita)
            $result[] = new ImportedTransaction(
                date:        $date,
                description: $desc,
                amountCents: abs($cents),
                type:        $cents >= 0 ? 'expense' : 'income',
                raw:         $row,
            );
        }

        return $result;
    }

    private static function parseNubank(string $content): array
    {
        $rows   = self::csvToArray($content, ',');
        $result = [];
        $first  = true;
        foreach ($rows as $row) {
            if ($first) { $first = false; continue; }
            if (count($row) < 4) continue;
            $date  = self::parseDate(trim($row[0]));
            $cat   = trim($row[1]);
            $desc  = trim($row[2]);
            $cents = self::parseMoney(trim($row[3]));
            if (!$date || $cents === null) continue;
            $result[] = new ImportedTransaction($date, $desc, abs($cents), $cents > 0 ? 'expense' : 'income', $cat, $row);
        }
        return $result;
    }

    private static function parseItau(string $content): array
    {
        $rows   = self::csvToArray($content, ';');
        $result = [];
        $first  = true;
        foreach ($rows as $row) {
            if ($first) { $first = false; continue; }
            if (count($row) < 5) continue;
            $date   = self::parseDate(trim($row[0]));
            $desc   = trim($row[1]);
            $credit = self::parseMoney(trim($row[3] ?? ''));
            $debit  = self::parseMoney(trim($row[4] ?? ''));
            if (!$date) continue;
            if ($credit !== null && $credit > 0) $result[] = new ImportedTransaction($date, $desc, $credit, 'income', '', $row);
            elseif ($debit !== null && $debit > 0) $result[] = new ImportedTransaction($date, $desc, $debit, 'expense', '', $row);
        }
        return $result;
    }

    private static function parseBradesco(string $content): array
    {
        $rows   = self::csvToArray($content, ';');
        $result = [];
        $first  = true;
        foreach ($rows as $row) {
            if ($first) { $first = false; continue; }
            if (count($row) < 3) continue;
            $date  = self::parseDate(trim($row[0]));
            $desc  = trim($row[1]);
            $cents = self::parseMoney(trim($row[2]));
            if (!$date || $cents === null) continue;
            $result[] = new ImportedTransaction($date, $desc, abs($cents), $cents < 0 ? 'expense' : 'income', '', $row);
        }
        return $result;
    }

    private static function parseGeneric(string $content): array
    {
        $delim = self::detectDelimiter($content);
        $rows  = self::csvToArray($content, $delim);
        $result = [];
        $first  = true;
        foreach ($rows as $row) {
            if ($first) { $first = false; continue; }
            if (count($row) < 3) continue;
            $date  = self::parseDate(trim($row[0]));
            $desc  = trim($row[1]);
            $cents = self::parseMoney(trim($row[2]));
            if (!$date || $cents === null) continue;
            $result[] = new ImportedTransaction($date, $desc, abs($cents), $cents < 0 ? 'expense' : 'income', '', $row);
        }
        return $result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public static function normalizeEncoding(string $content): string
    {
        // Remove BOM UTF-8 (EF BB BF)
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $enc = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        if ($enc && $enc !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $enc);
        }

        return $content;
    }

    private static function csvToArray(string $content, string $delimiter): array
    {
        $lines  = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        $result = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;
            $result[] = str_getcsv($line, $delimiter);
        }
        return $result;
    }

    private static function detectDelimiter(string $content): string
    {
        $line   = strtok($content, "\n");
        $counts = [';' => substr_count($line, ';'), ',' => substr_count($line, ',')];
        arsort($counts);
        return array_key_first($counts);
    }

    private static function parseDate(string $raw): ?string
    {
        // DD/MM/AAAA ou DD-MM-AAAA
        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $raw, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        // AAAA-MM-DD
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $raw)) {
            return $raw;
        }
        return null;
    }

    /**
     * Converte string monetária para centavos.
     * Aceita: "R$ 73,90", "1.234,56", "73,90", "-150,00", "100.00"
     */
    private static function parseMoney(string $raw): ?int
    {
        // Remove símbolo de moeda, espaços e caracteres não numéricos exceto . , -
        $raw = preg_replace('/[^\d.,\-]/', '', $raw);
        $raw = trim($raw);

        if ($raw === '' || $raw === '-') return null;

        $negative = str_starts_with($raw, '-');
        $raw      = ltrim($raw, '-+');

        // Formato BR com ponto de milhar: 1.234,56
        if (preg_match('/^\d{1,3}(\.\d{3})+,\d{2}$/', $raw)) {
            $raw = str_replace(['.', ','], ['', '.'], $raw);
        }
        // Formato BR simples: 73,90 ou 1234,56
        elseif (preg_match('/^\d+,\d{1,2}$/', $raw)) {
            $raw = str_replace(',', '.', $raw);
        }
        // Formato US: 1234.56
        elseif (preg_match('/^\d+\.\d{1,2}$/', $raw)) {
            // já está correto
        }
        // Apenas dígitos
        elseif (preg_match('/^\d+$/', $raw)) {
            // inteiro, trata como centavos? Não — trata como reais
        }
        else {
            return null;
        }

        $cents = (int) round((float) $raw * 100);
        return $negative ? -$cents : $cents;
    }
}
