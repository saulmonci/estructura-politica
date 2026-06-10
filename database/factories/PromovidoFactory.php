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
        $faker = \Faker\Factory::create();
        return [
            'nombre_completo' => $faker->name(),
            'clave_elector' => $faker->unique()->regexify('[A-Z]{6}[0-9]{8}[H,M][0-9]{3}'),
            'telefono' => $faker->numerify('##########'),
            'seccion_electoral' => $faker->numberBetween(1, 1000),
            'colonia' => $faker->streetName(),
            'promotor_id' => User::where('role', 'promotor')->inRandomOrder()->first()->id ?? User::factory()->create(['role' => 'promotor'])->id,
        ];
    }
}
