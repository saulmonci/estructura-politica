<?php

$baseUrl = "https://api.github.com/repos/angelsantosa/inegi-lista-estados/contents/cities/";
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'User-Agent: PHP-Script'
        ]
    ]
]);

$allData = [];

echo "Fetching states...\n";
for ($i = 1; $i <= 32; $i++) {
    $url = $baseUrl . $i . ".json";
    $response = @file_get_contents($url, false, $context);
    if ($response) {
        $json = json_decode($response, true);
        if (isset($json['content'])) {
            $content = base64_decode($json['content']);
            $data = json_decode($content, true);
            
            foreach ($data as $row) {
                // Ignore "todo el estado" row
                if ($row['clave_municipio'] == '0') {
                    if (!isset($allData[$row['nombre_entidad']])) {
                        $allData[$row['nombre_entidad']] = [
                            'clave_entidad' => str_pad($row['clave_entidad'], 2, '0', STR_PAD_LEFT),
                            'municipios' => []
                        ];
                    }
                    continue;
                }
                
                if (!isset($allData[$row['nombre_entidad']])) {
                    $allData[$row['nombre_entidad']] = [
                        'clave_entidad' => str_pad($row['clave_entidad'], 2, '0', STR_PAD_LEFT),
                        'municipios' => []
                    ];
                }

                $allData[$row['nombre_entidad']]['municipios'][] = [
                    'nombre' => $row['nombre_municipio'],
                    'clave_municipio' => str_pad($row['clave_municipio'], 3, '0', STR_PAD_LEFT),
                ];
            }
            echo "Fetched state $i\n";
        }
    } else {
        echo "Failed to fetch state $i\n";
    }
}

file_put_contents(__DIR__ . '/database/inegi_claves.json', json_encode($allData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Done! Data saved to database/inegi_claves.json\n";
