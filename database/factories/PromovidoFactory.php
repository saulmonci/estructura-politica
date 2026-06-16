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
            'nombre' => fake()->firstName(),
            'apellidos' => fake()->lastName(),
            'clave_elector' => strtoupper(\Illuminate\Support\Str::random(6)) . rand(10000000, 99999999) . 'H' . rand(100, 999),
            'telefono' => '55' . rand(10000000, 99999999),
            'seccion_electoral' => (string) rand(1, 1000),
            'colonia' => 'Colonia ' . \Illuminate\Support\Str::random(5),
            'promotor_id' => User::where('role', 'promotor')->inRandomOrder()->first()->id ?? User::factory()->create(['role' => 'promotor'])->id,
        ];
    }
}
