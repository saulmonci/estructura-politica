<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Agregar columnas
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('presidente_id')->nullable()->constrained('users')->onDelete('set null');
        });

        Schema::table('promovidos', function (Blueprint $table) {
            $table->foreignId('presidente_id')->nullable()->constrained('users')->onDelete('set null');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('presidente_id')->nullable()->constrained('users')->onDelete('set null');
        });

        Schema::table('apoyos', function (Blueprint $table) {
            $table->foreignId('presidente_id')->nullable()->constrained('users')->onDelete('set null');
        });

        // 2. Realizar Backfill
        // A) Backfill para Users
        $users = DB::table('users')->get();
        foreach ($users as $user) {
            if ($user->role === 'presidente') {
                DB::table('users')->where('id', $user->id)->update(['presidente_id' => $user->id]);
                continue;
            }

            $currentParentId = $user->parent_id;
            $visited = [];
            $rootPresidentId = null;

            while ($currentParentId && !in_array($currentParentId, $visited)) {
                $visited[] = $currentParentId;
                $parent = DB::table('users')->where('id', $currentParentId)->first();
                if (!$parent) {
                    break;
                }
                if ($parent->role === 'presidente') {
                    $rootPresidentId = $parent->id;
                    break;
                }
                $currentParentId = $parent->parent_id;
            }

            if ($rootPresidentId) {
                DB::table('users')->where('id', $user->id)->update(['presidente_id' => $rootPresidentId]);
            }
        }

        // B) Backfill para Promovidos
        $promovidos = DB::table('promovidos')->get();
        foreach ($promovidos as $promovido) {
            if ($promovido->promotor_id) {
                $promotor = DB::table('users')->where('id', $promovido->promotor_id)->first();
                if ($promotor && $promotor->presidente_id) {
                    DB::table('promovidos')->where('id', $promovido->id)->update(['presidente_id' => $promotor->presidente_id]);
                }
            }
        }

        // C) Backfill para Activity Logs
        $logs = DB::table('activity_logs')->get();
        foreach ($logs as $log) {
            if ($log->user_id) {
                $user = DB::table('users')->where('id', $log->user_id)->first();
                if ($user && $user->presidente_id) {
                    DB::table('activity_logs')->where('id', $log->id)->update(['presidente_id' => $user->presidente_id]);
                }
            }
        }

        // D) Backfill para Apoyos
        $apoyos = DB::table('apoyos')->get();
        foreach ($apoyos as $apoyo) {
            $ownerPresidenteId = null;
            if ($apoyo->promovido_id) {
                $promovido = DB::table('promovidos')->where('id', $apoyo->promovido_id)->first();
                if ($promovido && $promovido->presidente_id) {
                    $ownerPresidenteId = $promovido->presidente_id;
                }
            } elseif ($apoyo->user_id) {
                $user = DB::table('users')->where('id', $apoyo->user_id)->first();
                if ($user && $user->presidente_id) {
                    $ownerPresidenteId = $user->presidente_id;
                }
            }
            if ($ownerPresidenteId) {
                DB::table('apoyos')->where('id', $apoyo->id)->update(['presidente_id' => $ownerPresidenteId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apoyos', function (Blueprint $table) {
            $table->dropForeign(['presidente_id']);
            $table->dropColumn('presidente_id');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropForeign(['presidente_id']);
            $table->dropColumn('presidente_id');
        });

        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropForeign(['presidente_id']);
            $table->dropColumn('presidente_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['presidente_id']);
            $table->dropColumn('presidente_id');
        });
    }
};
