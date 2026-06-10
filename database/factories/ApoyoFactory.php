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
        $faker = \Faker\Factory::create();
        return [
            'promovido_id' => Promovido::factory(),
            'fecha' => $faker->date(),
            'tipo_apoyo' => $faker->randomElement(['Despensa', 'Silla de Ruedas', 'Láminas', 'Gestión Médica', 'Apoyo Económico', 'Material de Construcción']),
            'descripcion' => $faker->optional()->sentence(),
            'estado' => $faker->randomElement(['Entregado', 'Entregado', 'Pendiente', 'Cancelado']),
            'cantidad_monetaria' => $faker->optional()->randomFloat(2, 500, 5000),
        ];
    }
}
