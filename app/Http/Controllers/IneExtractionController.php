<?php

namespace App\Http\Controllers;

use App\Models\SeccionElectoral;
use App\Services\ErrorLoggerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IneExtractionController extends Controller
{
    public function extract(Request $request)
    {
        $request->validate([
            'ine_image' => 'required|image',
        ]);

        try {
            $imageFile = $request->file('ine_image');
            $imageContent = base64_encode(file_get_contents($imageFile->getRealPath()));
            $mimeType = $imageFile->getClientMimeType();

            $apiKey = config('services.gemini.api_key') ?: env('GEMINI_API_KEY');

            if (! $apiKey) {
                return response()->json(['success' => false, 'message' => 'API Key de Gemini no configurada.'], 500);
            }

            $prompt = "Extrae de esta identificación mexicana (credencial para votar INE/IFE) los siguientes datos en formato JSON estricto (solo devuelve el JSON, nada de texto extra ni markdown bloques): nombre, apellidos, curp, clave_elector, seccion_electoral (aparece como SECCION, 4 dígitos), sexo (H o M), calle, numero_exterior, numero_interior, colonia, codigo_postal, anio_emision (el año de 4 dígitos que aparece en el campo 'EMISIÓN' o 'EMISION', ej: 2016, 2017, 2018; NO confundir con año de registro ni fecha de nacimiento), vigencia (el año de 4 dígitos de vigencia que aparece en el campo 'VIGENCIA', ej: 2026, 2027, 2030). Si no es una identificación válida, devuelve el JSON con un campo 'error' con valor true y un 'mensaje'.";

            $response = Http::timeout(60)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inlineData' => [
                                    'mimeType' => $mimeType,
                                    'data' => $imageContent,
                                ],
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                ],
            ]);

            if ($response->successful()) {
                $geminiData = $response->json();

                if (isset($geminiData['candidates'][0]['content']['parts'][0]['text'])) {
                    $jsonString = trim($geminiData['candidates'][0]['content']['parts'][0]['text']);

                    // Si Gemini se cortó y no cerró el JSON, lo cerramos nosotros
                    if (! str_ends_with($jsonString, '}')) {
                        $jsonString .= "\n}";
                    }

                    // Extraer robustamente solo el contenido JSON desde la primera llave { hasta la última }
                    if (preg_match('/\{.*\}/s', $jsonString, $matches)) {
                        $jsonString = $matches[0];
                    }

                    $extractedData = json_decode($jsonString, true);

                    if ($extractedData === null) {
                        Log::error('Gemini devolvió un formato no válido. Raw string: '.$geminiData['candidates'][0]['content']['parts'][0]['text']);

                        return response()->json(['success' => false, 'message' => 'El formato devuelto por la IA no es un JSON válido.'], 500);
                    }

                    if (isset($extractedData['error']) && $extractedData['error'] === true) {
                        return response()->json(['success' => false, 'message' => $extractedData['mensaje'] ?? 'Imagen no reconocida como INE válida.'], 400);
                    }

                    // Extraer y normalizar anio_emision y vigencia
                    $anioEmision = null;
                    if (! empty($extractedData['anio_emision'])) {
                        if (preg_match('/\b(19\d{2}|20\d{2})\b/', (string) $extractedData['anio_emision'], $matches)) {
                            $anioEmision = (int) $matches[1];
                        }
                    } elseif (! empty($extractedData['emision'])) {
                        if (preg_match('/\b(19\d{2}|20\d{2})\b/', (string) $extractedData['emision'], $matches)) {
                            $anioEmision = (int) $matches[1];
                        }
                    }

                    $vigencia = null;
                    if (! empty($extractedData['vigencia'])) {
                        if (preg_match('/\b(19\d{2}|20\d{2})\b/', (string) $extractedData['vigencia'], $matches)) {
                            $vigencia = (int) $matches[1];
                        }
                    }

                    // En México las credenciales para votar tienen 10 años de vigencia.
                    // Si no se detectó directamente el año de emisión pero sí la vigencia:
                    if ($anioEmision === null && $vigencia !== null) {
                        $anioEmision = $vigencia - 10;
                    }

                    // Solo las credenciales con emisión del 2017 en adelante se pueden registrar.
                    // Si el año de emisión es menor a 2017 (ej: 2016 o anterior), o vigencia menor a 2027: INE VENCIDA NO VOTA
                    $esVencida = false;
                    if ($anioEmision !== null && $anioEmision < 2017) {
                        $esVencida = true;
                    } elseif ($vigencia !== null && $vigencia < 2027) {
                        $esVencida = true;
                        if ($anioEmision === null) {
                            $anioEmision = $vigencia - 10;
                        }
                    }

                    if ($esVencida) {
                        return response()->json([
                            'success' => false,
                            'error' => true,
                            'error_code' => 'INE_VENCIDA',
                            'message' => 'INE VENCIDA NO VOTA',
                            'anio_emision' => $anioEmision,
                            'vigencia' => $vigencia,
                        ], 422);
                    }

                    if ($anioEmision !== null) {
                        $extractedData['anio_emision'] = $anioEmision;
                    }
                    if ($vigencia !== null) {
                        $extractedData['vigencia'] = $vigencia;
                    }

                    // Mapear la sección a la demarcación correspondiente
                    if (isset($extractedData['seccion_electoral']) && $extractedData['seccion_electoral']) {
                        $secRaw = (string) $extractedData['seccion_electoral'];
                        $secTrimmed = ltrim($secRaw, '0');
                        $seccionModel = SeccionElectoral::where('numero', $secRaw)
                            ->orWhere('numero', $secTrimmed)
                            ->orWhere('numero', str_pad($secTrimmed, 4, '0', STR_PAD_LEFT))
                            ->first();

                        if ($seccionModel) {
                            $extractedData['seccion_electoral'] = (string) $seccionModel->numero;
                            if ($seccionModel->demarcacion_id) {
                                $extractedData['demarcacion_id'] = (string) $seccionModel->demarcacion_id;
                            }
                        }
                    }

                    if (isset($extractedData['clave_elector']) && ! isset($extractedData['clave_electoral'])) {
                        $extractedData['clave_electoral'] = $extractedData['clave_elector'];
                    }

                    return response()->json([
                        'success' => true,
                        'data' => $extractedData,
                    ]);
                }
            }

            $errorData = $response->json();
            $errorMessage = $errorData['error']['message'] ?? 'No se pudo procesar la imagen con Gemini.';
            Log::error('Error de Gemini API: '.$response->body());

            // Traducir mensajes comunes de Google para el usuario final
            if (str_contains($errorMessage, 'high demand') || str_contains($errorMessage, 'quota')) {
                $errorMessage = 'Los servidores de Inteligencia Artificial están saturados en este momento. Por favor, intenta de nuevo en unos minutos.';
            }

            return response()->json(['success' => false, 'message' => $errorMessage], $response->status());

        } catch (\Exception $e) {
            Log::error('Excepción en IneExtractionController: '.$e->getMessage());
            ErrorLoggerService::logException($e, $request, ['module' => 'Extracción INE / IA']);

            return response()->json(['success' => false, 'message' => 'Error interno al procesar la imagen.'], 500);
        }
    }
}
