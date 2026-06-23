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
        // 1. users table
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'demarcacion')) {
            // Add the new demarcacion_id column
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('demarcacion_id')->nullable()->after('demarcacion');
            });

            // Backfill: map existing string value to the big integer demarcacion_id
            $users = DB::table('users')->select('id', 'demarcacion')->get();
            foreach ($users as $user) {
                if (!empty($user->demarcacion)) {
                    // Extract digits from the string (e.g. "1" or "01 - Centro" -> 1)
                    preg_match('/\d+/', $user->demarcacion, $matches);
                    $demarcacionId = !empty($matches) ? (int)$matches[0] : null;

                    if ($demarcacionId) {
                        // Check if this demarcation ID exists in the demarcaciones table
                        $exists = DB::table('demarcaciones')->where('id', $demarcacionId)->exists();
                        if ($exists) {
                            DB::table('users')
                                ->where('id', $user->id)
                                ->update(['demarcacion_id' => $demarcacionId]);
                        }
                    }
                }
            }

            // Drop the old demarcacion string column and add foreign key
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('demarcacion');
                $table->foreign('demarcacion_id')->references('id')->on('demarcaciones')->onDelete('set null');
            });
        }

        // 2. promovidos table
        if (Schema::hasTable('promovidos') && Schema::hasColumn('promovidos', 'demarcacion')) {
            // Add the new demarcacion_id column
            Schema::table('promovidos', function (Blueprint $table) {
                $table->unsignedBigInteger('demarcacion_id')->nullable()->after('demarcacion');
            });

            // Backfill: map existing string value to the big integer demarcacion_id
            $promovidos = DB::table('promovidos')->select('id', 'demarcacion')->get();
            foreach ($promovidos as $promovido) {
                if (!empty($promovido->demarcacion)) {
                    // Extract digits from the string
                    preg_match('/\d+/', $promovido->demarcacion, $matches);
                    $demarcacionId = !empty($matches) ? (int)$matches[0] : null;

                    if ($demarcacionId) {
                        // Check if this demarcation ID exists in the demarcaciones table
                        $exists = DB::table('demarcaciones')->where('id', $demarcacionId)->exists();
                        if ($exists) {
                            DB::table('promovidos')
                                ->where('id', $promovido->id)
                                ->update(['demarcacion_id' => $demarcacionId]);
                        }
                    }
                }
            }

            // Drop the old demarcacion string column and add foreign key
            Schema::table('promovidos', function (Blueprint $table) {
                $table->dropColumn('demarcacion');
                $table->foreign('demarcacion_id')->references('id')->on('demarcaciones')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. users table
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'demarcacion_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['demarcacion_id']);
                $table->string('demarcacion')->nullable()->after('demarcacion_id');
            });

            // Restore data
            $users = DB::table('users')->select('id', 'demarcacion_id')->get();
            foreach ($users as $user) {
                if ($user->demarcacion_id) {
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['demarcacion' => (string)$user->demarcacion_id]);
                }
            }

            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('demarcacion_id');
            });
        }

        // 2. promovidos table
        if (Schema::hasTable('promovidos') && Schema::hasColumn('promovidos', 'demarcacion_id')) {
            Schema::table('promovidos', function (Blueprint $table) {
                $table->dropForeign(['demarcacion_id']);
                $table->string('demarcacion')->nullable()->after('demarcacion_id');
            });

            // Restore data
            $promovidos = DB::table('promovidos')->select('id', 'demarcacion_id')->get();
            foreach ($promovidos as $promovido) {
                if ($promovido->demarcacion_id) {
                    DB::table('promovidos')
                        ->where('id', $promovido->id)
                        ->update(['demarcacion' => (string)$promovido->demarcacion_id]);
                }
            }

            Schema::table('promovidos', function (Blueprint $table) {
                $table->dropColumn('demarcacion_id');
            });
        }
    }
};
