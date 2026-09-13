<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\UnresolvableMunicipalityException;
use App\Jobs\SendWhatsAppMessageJob;
use App\Models\User;
use App\Models\WarRoomConfig;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WarRoomAgentService
{
    protected WarRoomReportService $reportService;

    protected ?string $geminiApiKey;

    public function __construct(WarRoomReportService $reportService)
    {
        $this->reportService = $reportService;
        try {
            $this->geminiApiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        } catch (\Throwable $e) {
            $this->geminiApiKey = env('GEMINI_API_KEY');
        }
    }

    /**
     * Procesa un mensaje entrante de WhatsApp y responde de vuelta.
     */
    public function handleIncomingMessage(
        string $senderPhone,
        string $messageText,
        ?string $groupId = null,
        ?string $senderName = null,
        ?int $forcePresidenteId = null
    ): ?string {
        $cleanText = trim($messageText);
        if (empty($cleanText)) {
            return null;
        }

        // Si es un grupo, quitar menciones comunes tipo @ORION o @Agente
        $cleanText = preg_replace('/@\S+/u', '', $cleanText);
        $cleanText = trim($cleanText);

        // Identificar usuario emisor por teléfono si está registrado
        $user = null;
        try {
            $user = $this->findUserByPhone($senderPhone);
        } catch (\Throwable $e) {
            // Manejo tolerante si la BD no está disponible en pruebas
        }

        $senderPresidenteId = $user ? $user->getPresidenteId() : null;

        // Si viene de un grupo, verificar si el grupo ya está vinculado a una campaña
        $warRoomConfig = null;
        if (! empty($groupId)) {
            try {
                $warRoomConfig = WarRoomConfig::where('whatsapp_group_id', $groupId)->first();
            } catch (\Throwable $e) {
                // Silencioso
            }
        }

        // COMANDO DE AUTOGESTIÓN 1: Vincular Grupo como War Room (#vincular-warroom)
        if (! empty($groupId) && preg_match('/^#?(?:vincular[-_ ]warroom|vincular[-_ ]grupo|conectar[-_ ]warroom)/iu', $cleanText)) {
            if (! $user || $user->role !== UserRole::PRESIDENTE || ! $senderPresidenteId) {
                $msg = "⚠️ *Acceso no autorizado*\n\nTu número ({$senderPhone}) no está registrado como Presidente en el sistema para autorizar la vinculación de este War Room.";
                $this->reply($msg, $groupId);

                return $msg;
            }

            if ($warRoomConfig && $warRoomConfig->presidente_id !== $senderPresidenteId) {
                $msg = "⚠️ *Acceso no autorizado*\n\nEste grupo ya está vinculado a otra campaña electoral.";
                $this->reply($msg, $groupId);

                return $msg;
            }

            $pres = User::withoutGlobalScopes()->with('municipality')->find($senderPresidenteId);
            $presName = $pres ? $pres->name : 'Campaña';
            $muniName = $pres?->municipality?->nombre ?: 'Municipio';

            WarRoomConfig::updateOrCreate(
                ['presidente_id' => $senderPresidenteId],
                [
                    'whatsapp_group_id' => $groupId,
                    'reporte_matutino_enabled' => true,
                    'alertas_inactividad_enabled' => true,
                    'alertas_meta_enabled' => true,
                ]
            );

            $msg = "✅ *¡WAR ROOM VINCULADO EXITOSAMENTE!*\n\n".
                "Este grupo ha sido registrado como el *War Room Oficial* de la campaña de *{$presName}* en *{$muniName}*.\n\n".
                "A partir de ahora recibirán aquí de forma automática:\n".
                "📊 Reporte diario de avance territorial (8:00 AM)\n".
                "🎉 Alertas en vivo al cumplir el 100% de metas\n".
                "⚠️ Alertas preventivas de inactividad (24h)\n\n".
                "Cualquier integrante puede consultar métricas escribiendo:\n".
                "• *Reporte Dem 1*\n".
                "• *¿Quién no ha capturado hoy?*\n".
                '• *Reporte del día*';

            $this->reply($msg, $groupId);

            return $msg;
        }

        // COMANDO DE AUTOGESTIÓN 2: Activar Reportes por Mensaje Privado (#activar-reportes)
        if (preg_match('/^#?(?:activar[-_ ]reportes|recibir[-_ ]reportes|conectar[-_ ]reportes)/iu', $cleanText)) {
            if (! $user || $user->role !== UserRole::PRESIDENTE || ! $senderPresidenteId) {
                $msg = "⚠️ *Acceso no autorizado*\n\nTu número ({$senderPhone}) no está registrado como Presidente en el sistema electoral para autorizar la activación de reportes.";
                $this->reply($msg, $groupId ?: $senderPhone);

                return $msg;
            }

            $pres = User::withoutGlobalScopes()->with('municipality')->find($senderPresidenteId);
            $presName = $pres ? $pres->name : 'Campaña';

            WarRoomConfig::updateOrCreate(
                ['presidente_id' => $senderPresidenteId],
                [
                    'whatsapp_phone' => $senderPhone,
                    'reporte_matutino_enabled' => true,
                ]
            );

            $msg = "✅ *¡Reportes Personales Activados!*\n\n".
                "Se ha configurado tu número personal ({$senderPhone}) para recibir los reportes matutinos a las 8:00 AM correspondientes a la campaña de *{$presName}*.";

            $this->reply($msg, $groupId ?: $senderPhone);

            return $msg;
        }

        // COMANDO DE AUTOGESTIÓN 3: Desvincular War Room (#desvincular-warroom)
        if (! empty($groupId) && preg_match('/^#?(?:desvincular[-_ ]warroom|desconectar[-_ ]warroom)/iu', $cleanText)) {
            if (! $user || $user->role !== UserRole::PRESIDENTE || ! $senderPresidenteId) {
                $msg = "⚠️ *Acceso no autorizado*\n\nTu número ({$senderPhone}) no está registrado como Presidente en el sistema para autorizar la desvinculación de este War Room.";
                $this->reply($msg, $groupId);

                return $msg;
            }

            if ($warRoomConfig && $warRoomConfig->presidente_id !== $senderPresidenteId) {
                $msg = "⚠️ *Acceso no autorizado*\n\nEste War Room pertenece a otra campaña y no tienes autorización para desvincularlo.";
                $this->reply($msg, $groupId);

                return $msg;
            }

            if ($warRoomConfig) {
                $warRoomConfig->update(['whatsapp_group_id' => null]);
                $msg = 'ℹ️ Este grupo ha sido desvinculado del War Room.';
            } else {
                $msg = 'ℹ️ Este grupo no estaba vinculado a ningún War Room.';
            }

            $this->reply($msg, $groupId);

            return $msg;
        }

        // Resolver el presidenteId en orden de prioridad:
        // 1. Parámetro forzado (inyección directa / testing).
        // 2. Si el mensaje viene de un grupo registrado, usar el presidenteId de ese grupo.
        // 3. Si viene de un usuario registrado en el CRM, usar el presidenteId de su campaña.
        // 4. Fallback a .env si está definido (para pruebas manuales).
        $presidenteId = $forcePresidenteId ?? ($warRoomConfig ? $warRoomConfig->presidente_id : $senderPresidenteId);
        if (! $presidenteId) {
            $envPres = (int) env('ORION_PRESIDENTE_ID', 0);
            if ($envPres > 0) {
                $presidenteId = $envPres;
            }
        }

        // Si no se puede resolver la campaña o el usuario no está registrado, NUNCA enviar mensajes
        if (! $presidenteId) {
            return null;
        }

        try {
            // 1. Intentar resolver con patrones rápidos (Regex de alta velocidad < 5ms)
            $quickResponse = $this->tryPatternMatching($cleanText, $presidenteId);
            if ($quickResponse !== null) {
                $this->reply($quickResponse, $groupId ?: $senderPhone);

                return $quickResponse;
            }

            // 2. Si no es comando exacto y hay API Key de Gemini, usar Agente IA
            if (! empty($this->geminiApiKey)) {
                $aiResponse = $this->askGeminiAgent($cleanText, $user, $presidenteId);
                if ($aiResponse !== null) {
                    $this->reply($aiResponse, $groupId ?: $senderPhone);

                    return $aiResponse;
                }
            }
        } catch (UnresolvableMunicipalityException $e) {
            Log::warning("[WarRoomAgentService] No se pudo resolver municipio para presidente {$presidenteId}: ".$e->getMessage());
            $errorMsg = '⚠️ Lo siento, no se pudo determinar el municipio asignado a tu campaña. Por favor contacta al administrador del sistema.';
            $this->reply($errorMsg, $groupId ?: $senderPhone);

            return $errorMsg;
        }

        // 3. Solo enviar mensaje de ayuda si el usuario explícitamente pide ayuda o invoca a ORION
        if (preg_match('/^(?:#?(?:ayuda|help|menu|comandos)|(?:hola\s+)?orion)/iu', $cleanText)) {
            $helpResponse = "🤖 *Agente ORION - Comandos disponibles:*\n".
                "• *Reporte Dem 1* (o cualquier demarcación)\n".
                "• *¿Quién no ha capturado hoy?*\n".
                "• *Reporte del día* (o *Reporte general*)\n\n".
                '💡 *Configuración:* Escribe `#vincular-warroom` en un grupo para recibir reportes automáticos.';

            $this->reply($helpResponse, $groupId ?: $senderPhone);

            return $helpResponse;
        }

        // Para cualquier otro mensaje o charla cotidiana, permanecer en silencio
        return null;
    }

    /**
     * Busca al usuario en la base de datos por su número de teléfono.
     */
    protected function findUserByPhone(string $phone): ?User
    {
        $national = PhoneNumberNormalizer::toNational10($phone);
        if (! $national) {
            return null;
        }

        // TODO: Migración futura para normalización canónica de teléfonos:
        // 1. Agregar columna `telefono_canonico` VARCHAR(10) NOT NULL con índice B-tree en tabla `users`.
        // 2. Ejecutar script de migración/backfill:
        //    UPDATE users SET telefono_canonico = RIGHT(REGEXP_REPLACE(telefono, '\D', '', 'g'), 10);
        // 3. Sustituir búsqueda con variantes y LIKE por match exacto:
        //    User::withoutGlobalScopes()->where('telefono_canonico', $national)->first();

        $candidates = [
            $national,
            '52'.$national,
            '521'.$national,
            '+52'.$national,
            '+521'.$national,
        ];

        return User::withoutGlobalScopes()
            ->where(function ($q) use ($candidates, $national) {
                $q->whereIn('telefono', $candidates)
                    ->orWhere('telefono', 'like', "%{$national}");
            })
            ->first();
    }

    /**
     * Evaluación de comandos mediante Regex rápido.
     */
    protected function tryPatternMatching(string $text, ?int $presidenteId): ?string
    {
        // Limpiar signos de apertura/cierre tipo ¿ ? ¡ !
        $clean = trim(preg_replace('/^[¿¡\s]+|[?!.,\s]+$/u', '', $text));

        // Comando: "Reporte Dem X" o "Dem X"
        if (preg_match('/^(?:reporte\s+)?dem(?:arcaci[oó]n)?\s*(\d+)$/iu', $clean, $matches)) {
            $demNumber = $matches[1];

            return $this->reportService->getDemarcacionReport($demNumber, $presidenteId);
        }

        // Comando: "¿Quién no ha capturado hoy?" / "Quien no capturo hoy"
        if (preg_match('/(?:qui[eé]n(?:es)?\s+no\s+ha(?:n)?\s+capturado|sin\s+captura(?:s)?\s+hoy)/iu', $clean)) {
            return $this->reportService->getInactiveTodaySummary($presidenteId);
        }

        // Comando: "Reporte general" / "Reporte diario" / "Reporte del día" / "Reporte"
        if (preg_match('/^reporte(?:\s+(?:general|diario|del\s+d[ií]a|completo|hoy))?$/iu', $clean)) {
            return $this->reportService->buildDailyReportMessage($presidenteId);
        }

        return null;
    }

    /**
     * Agente IA conversacional impulsado por Gemini 2.0 Flash con Function Calling.
     */
    protected function askGeminiAgent(string $userPrompt, ?User $user, ?int $presidenteId): ?string
    {
        try {
            $userName = $user ? $user->name : 'Comandante';
            $userRole = $user ? ($user->role->value ?? (string) $user->role) : 'coordinador';

            $systemInstruction = 'Eres el Agente de Inteligencia ORION, un asistente estratégico del War Room electoral para campañas políticas en México. '.
                "Te estás comunicando con {$userName} (Rol: {$userRole}). ".
                'Responde de manera ejecutiva, concisa, profesional, estilo militar/estratégico, usando emojis adecuados. '.
                'Utiliza las herramientas disponibles para responder con datos fidedignos de la base de datos.';

            $tools = [
                [
                    'function_declarations' => [
                        [
                            'name' => 'obtener_reporte_demarcacion',
                            'description' => 'Consulta el avance, porcentaje, operador y última captura de una demarcación electoral específica.',
                            'parameters' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'demarcacion' => [
                                        'type' => 'STRING',
                                        'description' => 'Número o nombre de la demarcación (ej. "1", "Demarcación 7")',
                                    ],
                                ],
                                'required' => ['demarcacion'],
                            ],
                        ],
                        [
                            'name' => 'obtener_demarcaciones_sin_captura_hoy',
                            'description' => 'Obtiene la lista de demarcaciones o representantes que no han registrado avance hoy.',
                            'parameters' => [
                                'type' => 'OBJECT',
                                'properties' => (object) [],
                            ],
                        ],
                        [
                            'name' => 'obtener_reporte_general_del_dia',
                            'description' => 'Obtiene el reporte general completo de todas las demarcaciones con semáforo y operador del día.',
                            'parameters' => [
                                'type' => 'OBJECT',
                                'properties' => (object) [],
                            ],
                        ],
                    ],
                ],
            ];

            $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$this->geminiApiKey}";

            $payload = [
                'system_instruction' => [
                    'parts' => [
                        ['text' => $systemInstruction],
                    ],
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $userPrompt],
                        ],
                    ],
                ],
                'tools' => $tools,
            ];

            $response = Http::timeout(15)->post($endpoint, $payload);
            if (! $response->successful()) {
                Log::warning('[Gemini Agent ERROR] '.$response->body());

                return null;
            }

            $responseData = $response->json();
            $candidates = $responseData['candidates'] ?? [];
            if (empty($candidates)) {
                return null;
            }

            $parts = $candidates[0]['content']['parts'] ?? [];

            // Revisar si el modelo solicitó invocar una función (Tool Call)
            foreach ($parts as $part) {
                if (isset($part['functionCall'])) {
                    $fnName = $part['functionCall']['name'];
                    $fnArgs = $part['functionCall']['args'] ?? [];

                    $toolResult = match ($fnName) {
                        'obtener_reporte_demarcacion' => $this->reportService->getDemarcacionReport($fnArgs['demarcacion'] ?? '1', $presidenteId),
                        'obtener_demarcaciones_sin_captura_hoy' => $this->reportService->getInactiveTodaySummary($presidenteId),
                        'obtener_reporte_general_del_dia' => $this->reportService->buildDailyReportMessage($presidenteId),
                        default => 'Función no disponible',
                    };

                    // Enviar el resultado de la función de vuelta a Gemini para redactar la respuesta final
                    $followUpPayload = [
                        'contents' => [
                            [
                                'role' => 'user',
                                'parts' => [['text' => $userPrompt]],
                            ],
                            [
                                'role' => 'model',
                                'parts' => [$part],
                            ],
                            [
                                'role' => 'function',
                                'parts' => [
                                    [
                                        'functionResponse' => [
                                            'name' => $fnName,
                                            'response' => ['content' => $toolResult],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ];

                    $followUpResponse = Http::timeout(15)->post($endpoint, $followUpPayload);
                    if ($followUpResponse->successful()) {
                        $followParts = $followUpResponse->json()['candidates'][0]['content']['parts'] ?? [];
                        if (! empty($followParts[0]['text'])) {
                            return $followParts[0]['text'];
                        }
                    }

                    return $toolResult;
                }

                if (isset($part['text'])) {
                    return $part['text'];
                }
            }

            return null;
        } catch (UnresolvableMunicipalityException $e) {
            // Relanzar para que handleIncomingMessage maneje el fallo de municipio amigablemente
            throw $e;
        } catch (\Throwable $e) {
            try {
                Log::error('[Gemini Agent EXCEPTION] '.$e->getMessage());
            } catch (\Throwable) {
                // Silencioso: nunca permitir que fallos de logging propaguen excepciones al llamador
            }

            return null;
        }
    }

    /**
     * Envía la respuesta al canal correspondiente.
     */
    protected function reply(string $text, string $recipient): void
    {
        SendWhatsAppMessageJob::dispatch($recipient, $text);
    }
}
