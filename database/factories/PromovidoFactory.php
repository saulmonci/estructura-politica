<?php

namespace Database\Factories;

use App\Models\Promovido;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Enums\UserRole;

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
            'curp' => strtoupper(\Illuminate\Support\Str::random(4)) . rand(100000, 999999) . 'HDF' . \Illuminate\Support\Str::random(3) . rand(10, 99),
            'telefono' => '55' . rand(10000000, 99999999),
            'seccion_electoral' => (string) rand(1, 1000),
            'colonia' => fake()->word() . ' Sector ' . rand(1, 5),
            'calle' => fake()->streetName(),
            'numero' => (string) fake()->buildingNumber(),
            'codigo_postal' => sprintf('%05d', rand(10000, 99999)),
            'promotor_id' => User::where('role', UserRole::PROMOTOR)->inRandomOrder()->first()->id ?? User::factory()->create(['role' => UserRole::PROMOTOR])->id,
        ];
    }
}
