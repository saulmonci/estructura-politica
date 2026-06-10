<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Promovido;
use App\Models\Apoyo;

class PromovidoSeeder extends Seeder
{
    public function run(): void
    {
        // Crear 15 promovidos, cada uno con entre 0 y 3 apoyos
        Promovido::factory()
            ->count(15)
            ->has(Apoyo::factory()->count(rand(0, 3)))
            ->create();
    }
}
