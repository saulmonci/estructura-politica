<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\SeccionElectoral;
use App\Models\State;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MobileSyncController extends Controller
{
    /**
     * Obtener los catálogos necesarios para que el formulario funcione offline.
     * Solo descargamos lo esencial para ahorrar memoria en el dispositivo.
     */
    public function getCatalogos(Request $request)
    {
        try {
            $user = $request->user();

            $states = State::select('id', 'nombre as name')->get();
            $municipalities = Municipality::select('id', 'nombre as name', 'state_id')->get();
            $demarcaciones = Demarcacion::select('id', 'nombre as name', 'municipality_id')->get();
            $secciones = SeccionElectoral::select('id', 'numero as seccion', 'municipality_id', 'demarcacion_id')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'states' => $states,
                    'municipalities' => $municipalities,
                    'demarcaciones' => $demarcaciones,
                    'secciones' => $secciones,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error fetching catalogos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener catálogos'
            ], 500);
        }
    }

    /**
     * Recibe un bulk de promovidos creados localmente en el dispositivo
     * y los inserta en la base de datos de Laravel.
     */
    public function syncPromovidos(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'promovidos' => 'required|array',
        ]);

        $promovidos = $request->input('promovidos');
        $syncedIds = [];
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($promovidos as $index => $data) {
                try {
                    $fotoPath = $this->processBase64Image($data['foto'] ?? null, 'promovidos/fotos');
                    $ineFrentePath = $this->processBase64Image($data['ine_frente'] ?? null, 'promovidos/ine');
                    $ineReversoPath = $this->processBase64Image($data['ine_reverso'] ?? null, 'promovidos/ine');

                    if ($fotoPath) {
                        $data['foto'] = $fotoPath;
                    } else {
                        unset($data['foto']);
                    }

                    if ($ineFrentePath) {
                        $data['ine_frente'] = $ineFrentePath;
                    } else {
                        unset($data['ine_frente']);
                    }

                    if ($ineReversoPath) {
                        $data['ine_reverso'] = $ineReversoPath;
                    } else {
                        unset($data['ine_reverso']);
                    }

                    // Asignamos el usuario actual si no viene un promotor_id en el request
                    if (empty($data['promotor_id'])) {
                        $data['promotor_id'] = $user->id;
                    }

                    // Buscar primero por CURP, si no hay, por Clave de Elector
                    $searchCriteria = [];
                    if (!empty($data['curp'])) {
                        $searchCriteria['curp'] = $data['curp'];
                    } elseif (!empty($data['clave_elector'])) {
                        $searchCriteria['clave_elector'] = $data['clave_elector'];
                    } else {
                        $searchCriteria['nombre'] = $data['nombre'] ?? '';
                        $searchCriteria['apellidos'] = $data['apellidos'] ?? '';
                    }

                    $promovido = Promovido::updateOrCreate(
                        $searchCriteria,
                        $data
                    );

                    if (isset($data['local_id'])) {
                        $syncedIds[] = $data['local_id'];
                    }

                } catch (\Exception $e) {
                    Log::error('Error sync promovido index ' . $index . ': ' . $e->getMessage());
                    $errors[] = [
                        'local_id' => $data['local_id'] ?? $index,
                        'error' => $e->getMessage()
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sincronización completada',
                'data' => [
                    'synced_ids' => $syncedIds,
                    'errors' => $errors
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error global en syncPromovidos: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error crítico durante la sincronización',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function processBase64Image(?string $base64String, string $folder)
    {
        if (empty($base64String)) {
            return null;
        }

        if (preg_match('/^data:image\/(\w+);base64,/', $base64String, $type)) {
            $data = substr($base64String, strpos($base64String, ',') + 1);
            $type = strtolower($type[1]); 

            if (!in_array($type, [ 'jpg', 'jpeg', 'png' ])) {
                throw new \Exception('Formato de imagen inválido');
            }

            $data = base64_decode($data);
            if ($data === false) {
                throw new \Exception('La decodificación de base64 falló');
            }
        } else {
            $data = base64_decode($base64String);
            $type = 'jpg'; 
            if ($data === false) {
                return null;
            }
        }

        $fileName = Str::uuid() . '.' . $type;
        $path = $folder . '/' . $fileName;

        Storage::disk('public')->put($path, $data);

        return $path;
    }
}
