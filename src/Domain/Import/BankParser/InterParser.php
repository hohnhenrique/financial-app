<?php

declare(strict_types=1);

namespace App\Domain\Import\BankParser;

use App\Domain\Import\ImportedTransaction;

/**
 * Formato Inter:
 * Extrato conta corrente: CSV com separador ; e cabeçalho
 * Data;Tipo;Descrição;Valor
 * 15/05/2025;Pix Enviado;PAGAMENTO ENERGIA;-150,00
 * 20/05/2025;Pix Recebido;SALÁRIO;3500,00
 *
 * Extrato cartão: OFX ou CSV
 * Data;Histórico;Valor
 */
final class InterParser
{
    /** @return ImportedTransaction[] */
    public static function parse(string $content): array
    {
        $content = self::normalizeEncoding($content);
        $rows    = self::toRows($content, ';');
        $result  = [];
        $started = false;

        foreach ($rows as $row) {
            if (!$started) {
                $cols = array_map(fn($c) => mb_strtolower(trim($c)), $row);
                // Detecta linha de cabeçalho
                if (
                    in_array('data', $cols) ||
                    in_array('dt. movimento', $cols) ||
                    in_array('datamovimento', $cols)
                ) {
                    $started = true;
                }
                continue;
            }

            if (count($row) < 3) continue;

            // Tenta mapear colunas
            $rawDate  = trim($row[0] ?? '');
            $desc     = trim($row[2] ?? $row[1] ?? '');
            $rawValue = trim($row[3] ?? $row[2] ?? '');

            // Se 4 colunas: Data | Tipo | Descrição | Valor
            if (count($row) >= 4) {
                $desc     = trim($row[2]);
                $rawValue = trim($row[3]);
            }

            $date  = self::parseDate($rawDate);
            $cents = self::parseMoney($rawValue);

            if (!$date || $cents === null || $desc === '') continue;

            $result[] = new ImportedTransaction(
                date:        $date,
                description: $desc,
                amountCents: abs($cents),
                type:        $cents >= 0 ? 'income' : 'expense',
                raw:         $row,
            );
        }

        return $result;
    }

    private static function normalizeEncoding(string $content): string
    {
        $enc = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        if ($enc && $enc !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $enc);
        }
        return ltrim($content, "\xEF\xBB\xBF");
    }

    private static function toRows(string $content, string $delimiter): array
    {
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        return array_filter(
            array_map(fn($l) => str_getcsv(trim($l), $delimiter), $lines),
            fn($r) => count(array_filter($r)) > 0
        );
    }

    private static function parseDate(string $raw): ?string
    {
        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $raw, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $raw)) {
            return $raw;
        }
        return null;
    }

    private static function parseMoney(string $raw): ?int
    {
        $raw = trim(preg_replace('/[R$\s]/', '', $raw));
        if ($raw === '' || $raw === '-') return null;

        $negative = str_starts_with($raw, '-');
        $raw = ltrim($raw, '-+');

        if (preg_match('/^\d{1,3}(\.\d{3})*,\d{2}$/', $raw)) {
            $raw = str_replace(['.', ','], ['', '.'], $raw);
        } elseif (preg_match('/^\d+,\d{1,2}$/', $raw)) {
            $raw = str_replace(',', '.', $raw);
        } elseif (!preg_match('/^\d+(\.\d+)?$/', $raw)) {
            return null;
        }

        $cents = (int) round((float) $raw * 100);
        return $negative ? -$cents : $cents;
    }
}
