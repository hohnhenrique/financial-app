<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Core\Database\Connection;
use App\Core\Cache\SettingsCache;

final class SettingsController extends ApiController
{
    public function index(): string
    {
        $settings = SettingsCache::get($this->userId());

        return $this->success($settings);
//        $this->requireAuth();
//
//        $row = Connection::get()
//            ->prepare('SELECT * FROM user_settings WHERE user_id = ?')
//            ->execute([$this->userId()]);
//
//        // Cria configurações padrão se não existir
//        $pdo  = Connection::get();
//        $stmt = $pdo->prepare('SELECT * FROM user_settings WHERE user_id = ?');
//        $stmt->execute([$this->userId()]);
//        $settings = $stmt->fetch();
//
//        if (!$settings) {
//            $pdo->prepare("
//                INSERT INTO user_settings (user_id) VALUES (?)
//            ")->execute([$this->userId()]);
//
//            $stmt->execute([$this->userId()]);
//            $settings = $stmt->fetch();
//        }
//
//
//        return $this->success($settings);
    }

    public function update(): string
    {
        $this->requireAuth();

        $body = $this->body();
        $pdo  = Connection::get();

        $allowed = [
            'session_lifetime',
            'primary_color',
            'sidebar_color_from',
            'sidebar_color_to',
        ];

        $data = [];
        foreach ($allowed as $key) {
            if (!isset($body[$key])) continue;

            $val = $body[$key];

            // Validações
            if ($key === 'session_lifetime') {
                $val = (int) $val;
                if ($val < 15 || $val > 10080) {
                    return $this->error('Tempo de sessão deve ser entre 15 minutos e 7 dias.');
                }
            }

            if (in_array($key, ['primary_color', 'sidebar_color_from', 'sidebar_color_to'], true)) {
                if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $val)) {
                    return $this->error("Cor inválida: {$key}");
                }
            }

            $data[$key] = $val;
        }

        if (empty($data)) {
            return $this->error('Nenhum campo válido enviado.');
        }

        // Upsert
        $sets   = implode(', ', array_map(fn($k) => "{$k} = ?", array_keys($data)));
        $values = array_values($data);

        $exists = $pdo->prepare('SELECT id FROM user_settings WHERE user_id = ?');
        $exists->execute([$this->userId()]);

        if ($exists->fetch()) {
            $pdo->prepare("UPDATE user_settings SET {$sets}, updated_at = now() WHERE user_id = ?")
                ->execute([...$values, $this->userId()]);
        } else {
            $cols   = implode(', ', array_keys($data));
            $phs    = implode(', ', array_fill(0, count($data), '?'));
            $pdo->prepare("INSERT INTO user_settings (user_id, {$cols}) VALUES (?, {$phs})")
                ->execute([$this->userId(), ...$values]);
        }

        // Se mudou o tempo de sessão, atualiza a sessão atual
        if (isset($data['session_lifetime'])) {
            $_SESSION['session_lifetime'] = $data['session_lifetime'];
        }

        SettingsCache::forget($this->userId());

        return $this->success($data, 'Configurações salvas.');
    }
}
