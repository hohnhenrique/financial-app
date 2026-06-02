<?php

declare(strict_types=1);

namespace App\Core;

final class Container
{
    /** @var array<string, callable> */
    private array $bindings = [];

    /** @var array<string, object> */
    private array $singletons = [];

    /** @var array<string, object> */
    private array $instances = [];

    // ── Registro ──────────────────────────────────────────────────────────────

    /** Binding simples — cria nova instância a cada resolve */
    public function bind(string $abstract, callable $factory): void
    {
        $this->bindings[$abstract] = $factory;
    }

    /** Singleton — cria uma vez e reutiliza */
    public function singleton(string $abstract, callable $factory): void
    {
        $this->singletons[$abstract] = $factory;
    }

    /** Instância já criada — registra direto */
    public function instance(string $abstract, object $instance): void
    {
        $this->instances[$abstract] = $instance;
    }

    // ── Resolução ─────────────────────────────────────────────────────────────

    public function make(string $abstract): object
    {
        // 1. Instância registrada diretamente
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }

        // 2. Singleton — cria na primeira vez, reutiliza depois
        if (isset($this->singletons[$abstract])) {
            if (!isset($this->instances[$abstract])) {
                $this->instances[$abstract] = ($this->singletons[$abstract])($this);
            }
            return $this->instances[$abstract];
        }

        // 3. Binding simples — cria nova instância
        if (isset($this->bindings[$abstract])) {
            return ($this->bindings[$abstract])($this);
        }

        // 4. Auto-resolve por reflection
        return $this->autoResolve($abstract);
    }

    /** Alias para make() */
    public function get(string $abstract): object
    {
        return $this->make($abstract);
    }

    public function has(string $abstract): bool
    {
        return isset($this->bindings[$abstract])
            || isset($this->singletons[$abstract])
            || isset($this->instances[$abstract]);
    }

    // ── Auto-resolve via Reflection ───────────────────────────────────────────

    private function autoResolve(string $class): object
    {
        if (!class_exists($class)) {
            throw new \RuntimeException("Não foi possível resolver: {$class}");
        }

        $ref         = new \ReflectionClass($class);
        $constructor = $ref->getConstructor();

        if ($constructor === null) {
            return $ref->newInstance();
        }

        $args = [];
        foreach ($constructor->getParameters() as $param) {
            $type = $param->getType();

            if ($type instanceof \ReflectionNamedType && !$type->isBuiltin()) {
                $args[] = $this->make($type->getName());
            } elseif ($param->isDefaultValueAvailable()) {
                $args[] = $param->getDefaultValue();
            } else {
                throw new \RuntimeException(
                    "Não foi possível resolver o parâmetro \${$param->getName()} de {$class}"
                );
            }
        }

        return $ref->newInstanceArgs($args);
    }
}
