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

    private static function normalizeEncoding(string $content): string
    {
        $enc = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        if ($enc && $enc !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $enc);
        }
        return ltrim($content, "\xEF\xBB\xBF");
    }

    private static function parseRico(string $content): array
    {
        $rows    = self::csvToArray($content, ';');
        $result  = [];
        $started = false;

        foreach ($rows as $row) {
            if (!$started) {
                $cols = array_map(fn($c) => mb_strtolower(trim($c)), $row);
                if (in_array('data', $cols) || in_array('lançamento', $cols) || in_array('lancamento', $cols)) {
                    $started = true;
                }
                continue;
            }
            if (count($row) < 3) continue;
            $date  = self::parseDate(trim($row[0] ?? ''));
            $desc  = trim($row[1] ?? '');
            $cat   = trim($row[2] ?? '');
            $cents = self::parseMoney(trim($row[3] ?? $row[2] ?? ''));
            if (!$date || !$desc || $cents === null) continue;
            $result[] = new ImportedTransaction($date, $desc, abs($cents), $cents < 0 ? 'expense' : 'income', $cat, $row);
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
            if ($credit > 0) $result[] = new ImportedTransaction($date, $desc, $credit, 'income', '', $row);
            elseif ($debit > 0) $result[] = new ImportedTransaction($date, $desc, $debit, 'expense', '', $row);
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
        $rows   = self::csvToArray($content, self::detectDelimiter($content));
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

    private static function csvToArray(string $content, string $delimiter): array
    {
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        return array_filter(
            array_map(fn($l) => str_getcsv(trim($l), $delimiter), $lines),
            fn($r) => count(array_filter($r)) > 0
        );
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
        if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', $raw, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $raw)) return $raw;
        return null;
    }

    private static function parseMoney(string $raw): ?int
    {
        $raw = trim(preg_replace('/[R$\s]/', '', $raw));
        if ($raw === '' || $raw === '-') return null;
        $neg = str_starts_with($raw, '-');
        $raw = ltrim($raw, '-+');
        if (preg_match('/^\d{1,3}(\.\d{3})*,\d{2}$/', $raw)) $raw = str_replace(['.', ','], ['', '.'], $raw);
        elseif (preg_match('/^\d+,\d{1,2}$/', $raw)) $raw = str_replace(',', '.', $raw);
        elseif (!preg_match('/^\d+(\.\d+)?$/', $raw)) return null;
        $cents = (int) round((float) $raw * 100);
        return $neg ? -$cents : $cents;
    }
}
