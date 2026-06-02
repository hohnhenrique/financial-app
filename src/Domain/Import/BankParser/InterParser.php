<?php

declare(strict_types=1);

namespace App\Domain\Import\BankParser;

use App\Domain\Import\ImportedTransaction;

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
                if (in_array('data', $cols) || in_array('dt. movimento', $cols)) {
                    $started = true;
                }
                continue;
            }

            if (count($row) < 3) continue;

            $rawDate  = trim($row[0] ?? '');
            $desc     = count($row) >= 4 ? trim($row[2]) : trim($row[1]);
            $rawValue = count($row) >= 4 ? trim($row[3]) : trim($row[2]);

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
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }
        $enc = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        if ($enc && $enc !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $enc);
        }
        return $content;
    }

    private static function toRows(string $content, string $delimiter): array
    {
        $lines  = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        $result = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            // PHP 8.4: $escape explícito
            $row = str_getcsv($line, $delimiter, '"', '');

            if (count(array_filter($row, fn($v) => trim($v) !== '')) > 0) {
                $result[] = $row;
            }
        }

        return $result;
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
        $raw = trim(preg_replace('/[^\d.,\-]/', '', $raw));
        if ($raw === '' || $raw === '-') return null;

        $neg = str_starts_with($raw, '-');
        $raw = ltrim($raw, '-+');

        if (preg_match('/^\d{1,3}(\.\d{3})+,\d{2}$/', $raw)) {
            $raw = str_replace(['.', ','], ['', '.'], $raw);
        } elseif (preg_match('/^\d+,\d{1,2}$/', $raw)) {
            $raw = str_replace(',', '.', $raw);
        } elseif (!preg_match('/^\d+(\.\d+)?$/', $raw)) {
            return null;
        }

        $cents = (int) round((float) $raw * 100);
        return $neg ? -$cents : $cents;
    }
}
