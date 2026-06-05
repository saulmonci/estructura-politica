<?php

$faker = \Faker\Factory::create('es_MX');
\App\Models\User::unguard();

$users = \App\Models\User::where('role', 'operador')->get();
$count = 0;

foreach ($users as $u) {
    $u->update([
        'sexo' => $faker->randomElement(['Masculino', 'Femenino']),
        'calle' => $faker->streetName,
        'numero_exterior' => $faker->buildingNumber,
        'numero_interior' => $faker->optional(0.3)->buildingNumber,
        'colonia' => $faker->citySuffix,
        'demarcacion' => (string) $faker->numberBetween(1, 100),
        'clave_electoral' => strtoupper($faker->bothify('????????????######')),
        'telefono' => $faker->numerify('##########'),
        'curp' => strtoupper($faker->bothify('????######??????##')),
        'apodo' => $faker->optional(0.5)->firstName,
        'foto' => 'fotos/rd_default.jpg',
        'estado' => $faker->optional(0.1, 1)->randomElement([0, 1])
    ]);
    $count++;
}

echo "Filled data for {$count} operadores\n";
