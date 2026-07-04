<?php

$mexico = json_decode(file_get_contents('database/mexico.json'), true);
$inegi = json_decode(file_get_contents('database/inegi_claves.json'), true);

function removeAccents($string)
{
    return strtr(utf8_decode($string), utf8_decode('àáâãäçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ'), 'aaaaaceeeeiiiinooooouuuuyyAAAAACEEEEIIIINOOOOOUUUUY');
}

function mapStateName($name)
{
    $map = [
        'Veracruz' => 'Veracruz de Ignacio de la Llave',
        'Coahuila' => 'Coahuila de Zaragoza',
        'Michoacan' => 'Michoacán de Ocampo',
        'Estado de Mexico' => 'México',
        'Distrito Federal' => 'Ciudad de México',
    ];
    
    return $map[$name] ?? $name;
}

$missing = [];

foreach ($mexico as $estado => $municipios) {
    // Find matching state in INEGI json
    $inegiStateData = null;
    foreach ($inegi as $inegiEstado => $data) {
        if ($inegiEstado === $estado || mapStateName($inegiEstado) === $estado) {
            $inegiStateData = $data;
            break;
        }
    }
    
    if (!$inegiStateData) {
        echo "State not found in INEGI: $estado\n";
        continue;
    }
    
    foreach ($municipios as $muniDbName) {
        $found = false;
        foreach ($inegiStateData['municipios'] as $inegiMuni) {
            $muniName = $inegiMuni['nombre'];
            
            // Try direct match
            if ($muniName === $muniDbName) {
                $found = true;
                break;
            }
            
            // Try without accents / LIKE equivalent
            if (stripos($muniDbName, removeAccents($muniName)) !== false) {
                $found = true;
                break;
            }
            
            // Try reversed LIKE (inegi contains db name)
            if (stripos(removeAccents($muniName), removeAccents($muniDbName)) !== false) {
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            $missing[$estado][] = $muniDbName;
        }
    }
}

foreach ($missing as $estado => $munis) {
    echo "State: $estado (" . count($munis) . " missing)\n";
    foreach ($munis as $m) {
        echo " - $m\n";
    }
}
