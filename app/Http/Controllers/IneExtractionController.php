<?php

namespace App\Http\Controllers;

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

            $apiKey = env('GEMINI_API_KEY');

            if (!$apiKey) {
                return response()->json(['success' => false, 'message' => 'API Key de Gemini no configurada.'], 500);
            }

            $prompt = "Extrae de esta identificación mexicana los siguientes datos en formato JSON estricto (solo devuelve el JSON, nada de texto extra ni markdown bloques): nombre, apellidos, curp, clave_elector, seccion_electoral (aparece como SECCION, 4 dígitos), sexo (H o M), calle, numero_exterior, numero_interior, colonia, codigo_postal. Si no es una identificación válida, devuelve el JSON con un campo 'error' con valor true y un 'mensaje'.";

            $response = Http::timeout(60)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inlineData' => [
                                    'mimeType' => $mimeType,
                                    'data' => $imageContent
                                ]
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json'
                ]
            ]);

            if ($response->successful()) {
                $geminiData = $response->json();
                
                if (isset($geminiData['candidates'][0]['content']['parts'][0]['text'])) {
                    $jsonString = trim($geminiData['candidates'][0]['content']['parts'][0]['text']);
                    
                    // Si Gemini se cortó y no cerró el JSON, lo cerramos nosotros
                    if (!str_ends_with($jsonString, '}')) {
                        $jsonString .= "\n}";
                    }

                    // Extraer robustamente solo el contenido JSON desde la primera llave { hasta la última }
                    if (preg_match('/\{.*\}/s', $jsonString, $matches)) {
                        $jsonString = $matches[0];
                    }
                    
                    $extractedData = json_decode($jsonString, true);
                    
                    if ($extractedData === null) {
                        Log::error('Gemini devolvió un formato no válido. Raw string: ' . $geminiData['candidates'][0]['content']['parts'][0]['text']);
                        return response()->json(['success' => false, 'message' => 'El formato devuelto por la IA no es un JSON válido.'], 500);
                    }

                    // Mapear la sección a la demarcación correspondiente
                    if (isset($extractedData['seccion_electoral']) && $extractedData['seccion_electoral']) {
                        $seccionModel = \App\Models\SeccionElectoral::where('numero', $extractedData['seccion_electoral'])->first();
                        if ($seccionModel && $seccionModel->demarcacion_id) {
                            $extractedData['demarcacion_id'] = (string) $seccionModel->demarcacion_id;
                        }
                    }

                    if (isset($extractedData['error']) && $extractedData['error'] === true) {
                        return response()->json(['success' => false, 'message' => $extractedData['mensaje'] ?? 'Imagen no reconocida como INE válida.'], 400);
                    }

                    return response()->json([
                        'success' => true,
                        'data' => $extractedData
                    ]);
                }
            }

            $errorData = $response->json();
            $errorMessage = $errorData['error']['message'] ?? 'No se pudo procesar la imagen con Gemini.';
            Log::error('Error de Gemini API: ' . $response->body());
            
            // Traducir mensajes comunes de Google para el usuario final
            if (str_contains($errorMessage, 'high demand') || str_contains($errorMessage, 'quota')) {
                $errorMessage = 'Los servidores de Inteligencia Artificial están saturados en este momento. Por favor, intenta de nuevo en unos minutos.';
            }

            return response()->json(['success' => false, 'message' => $errorMessage], $response->status());

        } catch (\Exception $e) {
            Log::error('Excepción en IneExtractionController: ' . $e->getMessage());
            \App\Services\ErrorLoggerService::logException($e, $request, ['module' => 'Extracción INE / IA']);
            return response()->json(['success' => false, 'message' => 'Error interno al procesar la imagen.'], 500);
        }
    }
}
