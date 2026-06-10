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
        $tipos = ['Despensa', 'Silla de Ruedas', 'Láminas', 'Gestión Médica', 'Apoyo Económico', 'Material de Construcción'];
        $estados = ['Entregado', 'Entregado', 'Pendiente', 'Cancelado'];
        
        return [
            'promovido_id' => Promovido::factory(),
            'fecha' => now()->subDays(rand(1, 60))->format('Y-m-d'),
            'tipo_apoyo' => $tipos[array_rand($tipos)],
            'descripcion' => rand(0, 1) ? 'Descripción de prueba ' . \Illuminate\Support\Str::random(10) : null,
            'estado' => $estados[array_rand($estados)],
            'cantidad_monetaria' => rand(0, 1) ? rand(500, 5000) : null,
        ];
    }
}
