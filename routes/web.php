<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebController;
use App\Http\Controllers\RepresentanteDemarcacionController;
use App\Http\Controllers\OperadorController;
use App\Http\Controllers\PromotorController;
use App\Http\Controllers\PromovidoController;
use App\Http\Controllers\DemarcacionController;
use App\Http\Controllers\PresidenteController;
use App\Http\Controllers\CaceriaController;

Route::get('/', [WebController::class, 'showLogin'])->name('login');
Route::post('/login', [WebController::class, 'login']);
Route::post('/logout', [WebController::class, 'logout'])->name('logout');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [WebController::class, 'dashboard'])->name('dashboard');

    // Impersonación de Usuarios
    Route::get('/impersonate/search', [App\Http\Controllers\ImpersonateController::class, 'search'])->name('impersonate.search');
    Route::post('/impersonate/leave', [App\Http\Controllers\ImpersonateController::class, 'leave'])->name('impersonate.leave');
    Route::post('/impersonate/{user}', [App\Http\Controllers\ImpersonateController::class, 'take'])->name('impersonate.take');

    // CRUD para Presidentes (Solo Superuser / Admin)
    Route::get('/presidentes', [PresidenteController::class, 'index'])->name('presidentes.index');
    Route::post('/presidentes', [PresidenteController::class, 'store'])->name('presidentes.store');
    Route::get('/presidentes/export', [PresidenteController::class, 'export']);
    Route::post('/presidentes/{id}/restore', [PresidenteController::class, 'restore']);
    Route::post('/presidentes/{id}/toggle-status', [PresidenteController::class, 'toggleStatus']);
    Route::get('/presidentes/{id}', [PresidenteController::class, 'show']);
    Route::put('/presidentes/{id}', [PresidenteController::class, 'update']);
    Route::post('/presidentes/{id}', [PresidenteController::class, 'update']);
    Route::delete('/presidentes/{id}', [PresidenteController::class, 'destroy']);

    // CRUD para Coordinadores de Distrito (Presidente y Admin)
    Route::get('/coordinadores/export', [App\Http\Controllers\CoordinadorDistritoController::class, 'export']);
    Route::post('/coordinadores/{id}/restore', [App\Http\Controllers\CoordinadorDistritoController::class, 'restore']);
    Route::resource('coordinadores', App\Http\Controllers\CoordinadorDistritoController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);
    
    // CRUD para Demarcaciones (Solo Presidente)
    Route::get('/demarcaciones/export', [DemarcacionController::class, 'export']);
    Route::resource('demarcaciones', DemarcacionController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // Secciones Electorales de Demarcaciones (Solo Presidente)
    Route::get('/demarcaciones/{demarcacion}/secciones', [App\Http\Controllers\SeccionElectoralController::class, 'index']);
    Route::post('/demarcaciones/{demarcacion}/secciones', [App\Http\Controllers\SeccionElectoralController::class, 'store']);
    Route::put('/secciones/{seccion}', [App\Http\Controllers\SeccionElectoralController::class, 'update']);
    Route::delete('/secciones/{seccion}', [App\Http\Controllers\SeccionElectoralController::class, 'destroy']);

    // CRUD para Representantes de Demarcación (Solo Presidente)
    Route::get('/representantes/export', [RepresentanteDemarcacionController::class, 'export']);
    Route::post('/representantes/{id}/restore', [RepresentanteDemarcacionController::class, 'restore']);
    Route::resource('representantes', RepresentanteDemarcacionController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Operadores (Solo Presidente y RD)
    Route::get('/operadores/export', [OperadorController::class, 'export']);
    Route::post('/operadores/{id}/restore', [OperadorController::class, 'restore']);
    Route::resource('operadores', OperadorController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Promotores (Solo Presidente, RD y Operador)
    Route::get('/promotores/export', [PromotorController::class, 'export']);
    Route::post('/promotores/{id}/restore', [PromotorController::class, 'restore']);
    Route::resource('promotores', PromotorController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Promovidos (Todos)
    Route::get('/promovidos/export', [PromovidoController::class, 'export']);
    Route::post('/promovidos/{id}/restore', [PromovidoController::class, 'restore']);
    Route::resource('promovidos', PromovidoController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // Rutas para Apoyos de Promovidos
    Route::get('/promovidos/{promovido}/apoyos', [App\Http\Controllers\ApoyoController::class, 'index']);
    Route::post('/promovidos/{promovido}/apoyos', [App\Http\Controllers\ApoyoController::class, 'store']);

    // Rutas para Apoyos de Promotores, Operadores y Representantes
    Route::get('/promotores/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'indexForUser']);
    Route::post('/promotores/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'storeForUser']);
    
    Route::get('/operadores/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'indexForUser']);
    Route::post('/operadores/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'storeForUser']);

    Route::get('/representantes/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'indexForUser']);
    Route::post('/representantes/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'storeForUser']);

    // Actualizar y eliminar apoyos (compartido)
    Route::put('/apoyos/{apoyo}', [App\Http\Controllers\ApoyoController::class, 'update']);
    Route::delete('/apoyos/{apoyo}', [App\Http\Controllers\ApoyoController::class, 'destroy']);

    // Catálogos
    Route::get('/catalogos/estados', [App\Http\Controllers\CatalogoController::class, 'getEstados']);
    Route::get('/catalogos/municipios', [App\Http\Controllers\CatalogoController::class, 'getMunicipios']);
    Route::get('/catalogos/demarcaciones', [App\Http\Controllers\CatalogoController::class, 'getDemarcaciones']);
    Route::get('/catalogos/demarcaciones/{demarcacion}/secciones', [App\Http\Controllers\CatalogoController::class, 'getSecciones']);

    // OCR INE
    Route::post('/extract-ine', [App\Http\Controllers\IneExtractionController::class, 'extract']);

    // Mapa Territorial
    Route::get('/mapa', [WebController::class, 'mapa'])->name('mapa');

    // Módulo de Cacería Electoral / Día D (Check de Votantes)
    Route::get('/caceria', [CaceriaController::class, 'index'])->name('caceria.index');
    Route::post('/caceria/toggle-voto', [CaceriaController::class, 'toggleVoto'])->name('caceria.toggle-voto');
    Route::get('/caceria/export', [CaceriaController::class, 'export'])->name('caceria.export');

    // Bitácora / Logs de Actividad (Solo Presidente)
    Route::get('/logs', [App\Http\Controllers\ActivityLogController::class, 'index'])->name('logs.index');
    Route::get('/logs/{log}', [App\Http\Controllers\ActivityLogController::class, 'show'])->name('logs.show');

    // Vista visual del Código QR para el Agente ORION (Solo Superuser, Admin y Presidente)
    Route::get('/orion/qr', function () {
        abort_if(
            ! in_array(auth()->user()->role, [
                App\Enums\UserRole::SUPERUSER,
                App\Enums\UserRole::ADMIN,
                App\Enums\UserRole::PRESIDENTE,
            ], true),
            403
        );

        $gatewayUrl = config('services.whatsapp.url', env('WHATSAPP_GATEWAY_URL', 'http://evolution-api:8080'));
        $apiKey = config('services.whatsapp.key', env('WHATSAPP_API_KEY', 'orion_secret_key_123'));
        $instance = config('services.whatsapp.instance', env('WHATSAPP_INSTANCE', 'orion'));

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $apiKey,
            ])->timeout(8)->get(rtrim($gatewayUrl, '/') . "/instance/connect/{$instance}");

            $base64 = $response->json('base64') ?? $response->json('qrcode.base64');

            if (! $base64) {
                $stateRes = \Illuminate\Support\Facades\Http::withHeaders(['apikey' => $apiKey])
                    ->get(rtrim($gatewayUrl, '/') . "/instance/connectionState/{$instance}");
                $state = $stateRes->json('instance.state');
                if ($state === 'open') {
                    return "<div style='font-family:system-ui; background:#0f172a; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;'>
                        <div style='background:#1e293b; padding:40px; border-radius:16px; text-align:center;'>
                            <h1 style='color:#4ade80;'>✅ ¡WhatsApp ya está Conectado!</h1>
                            <p style='color:#94a3b8;'>La instancia <b>{$instance}</b> está activa y lista en el War Room.</p>
                        </div>
                    </div>";
                }
            }

            return "<html>
            <head><title>Vincular WhatsApp - Agente ORION</title><meta charset='utf-8'></head>
            <body style='font-family:system-ui; background:#0f172a; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;'>
                <div style='background:#1e293b; padding:35px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.5); text-align:center; max-width:400px;'>
                    <h2 style='margin-top:0;'>🤖 Agente ORION</h2>
                    <p style='color:#94a3b8; font-size:14px; margin-bottom:20px;'>Abre WhatsApp en tu celular > <b>Dispositivos vinculados</b> > <b>Vincular un dispositivo</b> y escanea este código:</p>
                    <div style='background:white; padding:16px; border-radius:16px; display:inline-block;'>
                        <img src='{$base64}' style='width:260px; height:260px; display:block;' alt='QR WhatsApp' />
                    </div>
                    <p style='font-size:12px; color:#64748b; margin-top:20px;'>Si tarda en vincular, recarga esta página para actualizar el código QR.</p>
                </div>
            </body>
            </html>";
        } catch (\Throwable $e) {
            return "<div style='font-family:sans-serif; text-align:center; padding:40px;'>
                <h3>Error al conectar con Evolution API</h3>
                <p>{$e->getMessage()}</p>
            </div>";
        }
    });
});

// Ruta comodín para la App de Promotores en React (PWA)
Route::get('/app-promotores/{any?}', function () {
    $path = public_path('app-promotores/index.html');
    if (file_exists($path)) {
        return file_get_contents($path);
    }
    abort(404, 'La aplicación de promotores no ha sido instalada o el build no se encuentra.');
})->where('any', '.*');
