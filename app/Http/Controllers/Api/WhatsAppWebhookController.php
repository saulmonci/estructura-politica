<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessWhatsAppIncomingMessageJob;
use App\Models\User;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    /**
     * Endpoint Webhook para recibir eventos y mensajes desde el Gateway de WhatsApp (Evolution API / Baileys).
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();

        // 1. Verificación obligatoria del token secreto del Webhook (Fail-Closed)
        $secretToken = (string) (config('services.whatsapp.webhook_secret') ?: env('WHATSAPP_WEBHOOK_SECRET'));
        $providedToken = (string) $request->header('X-Webhook-Token', '');

        if (empty($secretToken) || ! hash_equals($secretToken, $providedToken)) {
            Log::warning('[WhatsApp Webhook] Rechazado: token no configurado o inválido.');

            return response()->json(['error' => 'No autorizado'], 401);
        }

        // 2. Extraer datos del evento (compatible con Evolution API y payloads directos)
        $data = $payload['data'] ?? $payload;
        $key = $data['key'] ?? [];

        // Ignorar mensajes enviados por el propio bot para evitar bucles infinitos
        if (! empty($key['fromMe'])) {
            return response()->json(['status' => 'ignored_from_me']);
        }

        $remoteJid = $key['remoteJid'] ?? ($payload['remoteJid'] ?? null);
        if (! $remoteJid) {
            return response()->json(['status' => 'no_remote_jid']);
        }

        $isGroup = str_ends_with($remoteJid, '@g.us');
        $groupId = $isGroup ? $remoteJid : null;

        // En grupos, el emisor real viene en 'participant'; en DMs viene en 'remoteJid'
        $senderJid = $key['participant'] ?? ($data['participant'] ?? $remoteJid);
        $senderPhone = explode('@', $senderJid)[0];
        $senderName = $data['pushName'] ?? ($payload['senderName'] ?? 'Usuario');

        // Extraer texto del mensaje
        $message = $data['message'] ?? ($payload['message'] ?? []);
        $text = null;

        if (is_string($message)) {
            $text = $message;
        } elseif (is_array($message)) {
            $text = $message['conversation']
                ?? $message['extendedTextMessage']['text']
                ?? $message['text']
                ?? null;
        }

        // Si es payload directo de prueba tipo: {"number": "3221234567", "text": "Reporte Dem 1"}
        if (! $text && isset($payload['text'])) {
            $text = $payload['text'];
            $senderPhone = $payload['number'] ?? $payload['phone'] ?? $senderPhone;
        }

        if (empty($text)) {
            return response()->json(['status' => 'no_text_content']);
        }

        // SALVAGUARDA DE PRIVACIDAD ESTRICTA:
        // Si es un mensaje privado (no es grupo) y el número NO está registrado en la estructura electoral,
        // IGNORAR SILENCIOSAMENTE. Nunca enviar respuestas automáticas a contactos personales.
        if (! $isGroup) {
            $national = PhoneNumberNormalizer::toNational10($senderPhone);
            if (! $national) {
                return response()->json(['status' => 'ignored_personal_contact']);
            }

            // TODO: Migración futura para normalización canónica de teléfonos:
            // 1. Columna `telefono_canonico` VARCHAR(10) con índice B-tree en tabla `users`.
            // 2. Sustituir búsqueda con variantes y LIKE por match exacto:
            //    User::withoutGlobalScopes()->where('telefono_canonico', $national)->exists();
            $candidates = [
                $national,
                '52'.$national,
                '521'.$national,
                '+52'.$national,
                '+521'.$national,
            ];

            $isRegistered = User::withoutGlobalScopes()
                ->where(function ($q) use ($candidates, $national) {
                    $q->whereIn('telefono', $candidates)
                        ->orWhere('telefono', 'like', "%{$national}");
                })
                ->exists();

            if (! $isRegistered) {
                // Es un contacto personal (amigo, familiar, etc.), ignorar 100% en silencio
                return response()->json(['status' => 'ignored_personal_contact']);
            }
        }

        Log::info("[WhatsApp Webhook] Mensaje encolado de {$senderPhone} en ".($groupId ?: 'DM').": {$text}");

        // 3. Despachar el procesamiento del mensaje al Worker de colas en segundo plano
        ProcessWhatsAppIncomingMessageJob::dispatch(
            $senderPhone,
            $text,
            $groupId,
            $senderName
        );

        return response()->json([
            'status' => 'queued',
        ]);
    }
}
