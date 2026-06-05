<?php

use App\Models\User;
use App\Models\Promovido;

$user = User::find(1);

$rds = [];
if ($user->role === 'presidente') {
    $rdsList = User::where('parent_id', $user->id)->where('role', 'rd')->get();
    echo "Encontrados " . $rdsList->count() . " RDs.\n";
    foreach($rdsList as $rd) {
        $op = User::where('parent_id', $rd->id)->where('role', 'operador')->count();
        $pr = User::where('parent_id', $rd->id)->where('role', 'promotor')->count();
        $pm = Promovido::whereIn('promotor_id', function ($query) use ($rd) {
            $query->select('id')->from('users')->where('parent_id', $rd->id)->where('role', 'promotor');
        })->count();
        
        $rds[] = [
            'id' => $rd->id,
            'nombre' => $rd->name,
            'demarcacion' => '01 - Centro', // Simulado
            'operadores' => $op,
            'promotores' => $pr,
            'promovidos' => $pm,
            'total' => 1 + $op + $pr + $pm,
        ];
    }
}
echo "RDS Array Count: " . count($rds) . "\n";
