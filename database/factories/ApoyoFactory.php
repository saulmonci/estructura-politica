<?php

namespace Database\Factories;

use App\Models\Apoyo;
use App\Models\Promovido;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Apoyo>
 */
class ApoyoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'promovido_id' => Promovido::factory(),
            'fecha' => fake()->date(),
            'tipo_apoyo' => fake()->randomElement(['Despensa', 'Silla de Ruedas', 'Láminas', 'Gestión Médica', 'Apoyo Económico', 'Material de Construcción']),
            'descripcion' => fake()->optional()->sentence(),
            'estado' => fake()->randomElement(['Entregado', 'Entregado', 'Pendiente', 'Cancelado']),
            'cantidad_monetaria' => fake()->optional()->randomFloat(2, 500, 5000),
        ];
    }
}
