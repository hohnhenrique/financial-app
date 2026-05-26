<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
use App\Core\Log\Logger;
use App\Domain\Import\CsvImporter;

final class ImportController extends ApiController
{
    private const MAX_FILE_SIZE = 5 * 1024 * 1024;

    public function preview(): string
    {
        $this->requireAuth();
        [$content, $bank, $err] = $this->readUpload();
        if ($err) return $this->error($err);

        try {
            $rows = CsvImporter::parse($content, $bank);
            Logger::info('CSV preview', ['bank' => $bank, 'rows' => count($rows), 'user' => $this->userId()]);
            return $this->success([
                'bank'         => $bank,
                'total'        => count($rows),
                'transactions' => array_map(fn($t) => $t->toArray(), $rows),
            ]);
        } catch (\Throwable $e) {
            Logger::error('CSV parse error', ['error' => $e->getMessage()]);
            return $this->error('Erro ao processar: ' . $e->getMessage());
        }
    }

    public function import(): string
    {
        $this->requireAuth();

        $body         = $this->body();
        $transactions = $body['transactions'] ?? [];
        $userId       = $this->userId();

        if (empty($transactions)) return $this->error('Nenhuma transação para importar.');

        $pdo      = Connection::get();
        $imported = 0;

        $stmt = $pdo->prepare("
            INSERT INTO transactions
                (user_id, account_id, category_id, type, amount_cents, description, transaction_date)
            VALUES
                (:user_id, :account_id, :category_id, :type, :amount_cents, :description, :transaction_date)
        ");

        $pdo->beginTransaction();
        try {
            foreach ($transactions as $tx) {
                if (empty($tx['account_id']) || empty($tx['category_id'])) continue;

                $stmt->execute([
                    'user_id'          => $userId,
                    'account_id'       => $tx['account_id'],
                    'category_id'      => $tx['category_id'],
                    'type'             => $tx['type'],
                    'amount_cents'     => (int) $tx['amount_cents'],
                    'description'      => mb_substr($tx['description'], 0, 255),
                    'transaction_date' => $tx['date'],
                ]);
                $imported++;
            }
            $pdo->commit();
            Logger::info('CSV imported', ['user' => $userId, 'imported' => $imported]);
            return $this->success(['imported' => $imported], "{$imported} movimentações importadas.");
        } catch (\Throwable $e) {
            $pdo->rollBack();
            Logger::error('CSV import failed', ['error' => $e->getMessage()]);
            return $this->error('Erro ao importar: ' . $e->getMessage());
        }
    }

    private function readUpload(): array
    {
        $bank = $_POST['bank'] ?? 'rico';
        if (!array_key_exists($bank, CsvImporter::BANKS)) {
            return [null, null, 'Banco não suportado.'];
        }
        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) return [null, null, 'Arquivo não enviado.'];
        if ($file['size'] > self::MAX_FILE_SIZE) return [null, null, 'Arquivo muito grande (máx 5MB).'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['csv', 'txt', 'ofx'], true)) return [null, null, 'Formato inválido (.csv, .txt, .ofx).'];
        $content = file_get_contents($file['tmp_name']);
        if (!$content || trim($content) === '') return [null, null, 'Arquivo vazio.'];
        return [$content, $bank, null];
    }
}
