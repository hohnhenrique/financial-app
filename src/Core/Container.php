<?php

declare(strict_types=1);

namespace App\Core;

use ReflectionClass;
use RuntimeException;

final class Container
{
    private array $bindings  = [];
    private array $instances = [];

    public function bind(string $abstract, string $concrete): void
    {
        $this->bindings[$abstract] = $concrete;
    }

    public function singleton(string $abstract, callable $factory): void
    {
        $this->instances[$abstract] = $factory($this);
    }

    public function make(string $abstract): object
    {
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }

        $concrete   = $this->bindings[$abstract] ?? $abstract;
        $reflection = new ReflectionClass($concrete);

        if (!$reflection->isInstantiable()) {
            throw new RuntimeException("Classe [{$concrete}] não pode ser instanciada.");
        }

        $constructor = $reflection->getConstructor();

        if (!$constructor) {
            $instance = new $concrete();
            $this->instances[$abstract] = $instance;
            return $instance;
        }

        $dependencies = array_map(
            fn($param) => $this->make($param->getType()->getName()),
            $constructor->getParameters()
        );

        $instance = $reflection->newInstanceArgs($dependencies);
        $this->instances[$abstract] = $instance;

        return $instance;
    }
}
