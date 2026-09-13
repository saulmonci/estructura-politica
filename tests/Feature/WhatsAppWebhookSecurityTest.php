<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Jobs\ProcessWhatsAppIncomingMessageJob;
use App\Models\Municipality;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WhatsAppWebhookSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_rejects_when_secret_is_not_configured_fail_closed(): void
    {
        // Forzar secreto vacío o nulo
        Config::set('services.whatsapp.webhook_secret', null);
        putenv('WHATSAPP_WEBHOOK_SECRET=');

        $response = $this->postJson('/api/v1/whatsapp/webhook', [
            'text' => 'Hola',
        ]);

        $response->assertStatus(401);
        $response->assertJson(['error' => 'No autorizado']);
    }

    public function test_webhook_rejects_when_token_header_is_missing(): void
    {
        Config::set('services.whatsapp.webhook_secret', 'token_secreto_super_seguro_123');

        $response = $this->postJson('/api/v1/whatsapp/webhook', [
            'text' => 'Hola',
        ]);

        $response->assertStatus(401);
        $response->assertJson(['error' => 'No autorizado']);
    }

    public function test_webhook_rejects_when_token_header_is_invalid(): void
    {
        Config::set('services.whatsapp.webhook_secret', 'token_secreto_super_seguro_123');

        $response = $this->withHeader('X-Webhook-Token', 'token_falso_o_invalido')
            ->postJson('/api/v1/whatsapp/webhook', [
                'text' => 'Hola',
            ]);

        $response->assertStatus(401);
        $response->assertJson(['error' => 'No autorizado']);
    }

    public function test_webhook_accepts_when_token_header_matches(): void
    {
        Config::set('services.whatsapp.webhook_secret', 'token_secreto_super_seguro_123');

        $response = $this->withHeader('X-Webhook-Token', 'token_secreto_super_seguro_123')
            ->postJson('/api/v1/whatsapp/webhook', [
                'key' => ['fromMe' => true],
            ]);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'ignored_from_me']);
    }

    public function test_webhook_queues_process_job_when_registered_user_sends_message(): void
    {
        Queue::fake();

        $state = State::create(['nombre' => 'Nayarit']);
        $muni = Municipality::create(['nombre' => 'Bahía de Banderas', 'state_id' => $state->id]);
        User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'state_id' => $state->id,
            'municipality_id' => $muni->id,
            'telefono' => '3111234567',
        ]);

        Config::set('services.whatsapp.webhook_secret', 'token_secreto_super_seguro_123');

        $payload = [
            'data' => [
                'key' => [
                    'fromMe' => false,
                    'remoteJid' => '5213111234567@s.whatsapp.net',
                ],
                'pushName' => 'Juan Pérez',
                'message' => [
                    'conversation' => '¿Cómo vamos hoy?',
                ],
            ],
        ];

        $response = $this->withHeader('X-Webhook-Token', 'token_secreto_super_seguro_123')
            ->postJson('/api/v1/whatsapp/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'queued',
        ]);

        Queue::assertPushed(ProcessWhatsAppIncomingMessageJob::class, function ($job) {
            return $job->senderPhone === '5213111234567'
                && $job->messageText === '¿Cómo vamos hoy?'
                && $job->senderName === 'Juan Pérez';
        });
    }

    public function test_webhook_ignores_unregistered_personal_contact_and_does_not_queue_job(): void
    {
        Queue::fake();

        Config::set('services.whatsapp.webhook_secret', 'token_secreto_super_seguro_123');

        $payload = [
            'data' => [
                'key' => [
                    'fromMe' => false,
                    'remoteJid' => '5219999999999@s.whatsapp.net',
                ],
                'pushName' => 'Contacto Desconocido',
                'message' => [
                    'conversation' => 'Hola desconocido',
                ],
            ],
        ];

        $response = $this->withHeader('X-Webhook-Token', 'token_secreto_super_seguro_123')
            ->postJson('/api/v1/whatsapp/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJson(['status' => 'ignored_personal_contact']);

        Queue::assertNothingPushed();
    }

    public function test_webhook_queues_process_job_when_group_message_received(): void
    {
        Queue::fake();

        Config::set('services.whatsapp.webhook_secret', 'token_secreto_super_seguro_123');

        $payload = [
            'data' => [
                'key' => [
                    'fromMe' => false,
                    'remoteJid' => '120363023456789@g.us',
                    'participant' => '5213111234567@s.whatsapp.net',
                ],
                'pushName' => 'Juan en Grupo',
                'message' => [
                    'conversation' => 'Alerta en grupo',
                ],
            ],
        ];

        $response = $this->withHeader('X-Webhook-Token', 'token_secreto_super_seguro_123')
            ->postJson('/api/v1/whatsapp/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'queued',
        ]);

        Queue::assertPushed(ProcessWhatsAppIncomingMessageJob::class, function ($job) {
            return $job->groupId === '120363023456789@g.us'
                && $job->messageText === 'Alerta en grupo';
        });
    }
}
