<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Promovido;
use App\Models\Demarcacion;
use App\Models\ActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_logs()
    {
        $response = $this->get('/logs');
        $response->assertRedirect('/');
    }

    public function test_non_presidente_roles_cannot_access_logs()
    {
        $rd = User::factory()->create(['role' => 'rd']);

        $response = $this->actingAs($rd)->get('/logs');
        $response->assertStatus(403);
    }

    public function test_presidente_can_access_logs_and_details()
    {
        $presidente = User::factory()->create(['role' => 'presidente']);
        
        $log = ActivityLog::create([
            'user_id' => $presidente->id,
            'user_identifier' => 'PRES-0001 (Presidente)',
            'action' => 'created',
            'model_type' => Demarcacion::class,
            'model_friendly_name' => 'Demarcacion',
            'model_id' => '1',
            'model_representation' => 'Demarcación 1',
            'changed_data' => ['nombre' => 'Demarcación 1', 'meta' => 500]
        ]);

        $response = $this->actingAs($presidente)->get('/logs');
        $response->assertStatus(200);

        $responseDetail = $this->actingAs($presidente)->get("/logs/{$log->id}");
        $responseDetail->assertStatus(200);
        $responseDetail->assertJsonFragment([
            'model_representation' => 'Demarcación 1',
        ]);
    }

    public function test_automatic_activity_logging_on_create_update_delete()
    {
        $presidente = User::factory()->create(['role' => 'presidente']);
        
        // 1. Create a Demarcacion and assert activity log was created
        $demarcacion = Demarcacion::create([
            'id' => 12,
            'nombre' => 'Test Demarcacion',
            'meta' => 300
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'created',
            'model_friendly_name' => 'Demarcacion',
            'model_id' => '12',
            'model_representation' => 'Test Demarcacion',
        ]);

        // 2. Update Demarcacion and assert activity log was created with correct diff
        $demarcacion->update([
            'nombre' => 'Updated Demarcacion',
            'meta' => 350
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'updated',
            'model_friendly_name' => 'Demarcacion',
            'model_id' => '12',
            'model_representation' => 'Updated Demarcacion',
        ]);

        // 3. Delete Demarcacion and assert activity log was created
        $demarcacion->delete();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'deleted',
            'model_friendly_name' => 'Demarcacion',
            'model_id' => '12',
            'model_representation' => 'Updated Demarcacion',
        ]);
    }

    public function test_passwords_are_not_logged()
    {
        $presidente = User::factory()->create(['role' => 'presidente']);
        
        // When creating a user, verify no password gets logged
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@test.com',
            'password' => bcrypt('supersecretpassword123'),
            'role' => 'promotor'
        ]);

        // Find the log for this creation
        $log = ActivityLog::where('model_type', User::class)
            ->where('model_id', $user->id)
            ->where('action', 'created')
            ->first();

        $this->assertNotNull($log);
        $this->assertArrayNotHasKey('password', $log->changed_data);

        // When updating password, verify password is not logged
        $user->update([
            'password' => bcrypt('newpassword123'),
            'name' => 'John Updated'
        ]);

        $updateLog = ActivityLog::where('model_type', User::class)
            ->where('model_id', $user->id)
            ->where('action', 'updated')
            ->first();

        $this->assertNotNull($updateLog);
        $this->assertArrayNotHasKey('password', $updateLog->changed_data);
        if ($updateLog->original_data) {
            $this->assertArrayNotHasKey('password', $updateLog->original_data);
        }
    }
}
