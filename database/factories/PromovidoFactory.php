<?php

namespace Database\Factories;

use App\Models\Promovido;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Promovido>
 */
class PromovidoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre_completo' => fake()->name(),
            'clave_elector' => fake()->unique()->regexify('[A-Z]{6}[0-9]{8}[H,M][0-9]{3}'),
            'telefono' => fake()->numerify('##########'),
            'seccion_electoral' => fake()->numberBetween(1, 1000),
            'colonia' => fake()->streetName(),
            'promotor_id' => User::inRandomOrder()->first()->id ?? User::factory(),
        ];
    }
}
