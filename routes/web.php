<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\ApoyoController;
use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\CoordinadorDistritoController;
use App\Http\Controllers\DemarcacionController;
use App\Http\Controllers\ImpersonateController;
use App\Http\Controllers\IneExtractionController;
use App\Http\Controllers\OperadorController;
use App\Http\Controllers\PresidenteController;
use App\Http\Controllers\PromotorController;
use App\Http\Controllers\PromovidoController;
use App\Http\Controllers\RepresentanteDemarcacionController;
use App\Http\Controllers\SeccionElectoralController;
use App\Http\Controllers\WebController;
use Illuminate\Support\Facades\Route;

Route::get('/', [WebController::class, 'showLogin'])->name('login');
Route::post('/login', [WebController::class, 'login']);
Route::post('/logout', [WebController::class, 'logout'])->name('logout');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [WebController::class, 'dashboard'])->name('dashboard');

    // Impersonación de Usuarios
    Route::get('/impersonate/search', [ImpersonateController::class, 'search'])->name('impersonate.search');
    Route::post('/impersonate/leave', [ImpersonateController::class, 'leave'])->name('impersonate.leave');
    Route::post('/impersonate/{user}', [ImpersonateController::class, 'take'])->name('impersonate.take');

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
    Route::get('/coordinadores/export', [CoordinadorDistritoController::class, 'export']);
    Route::post('/coordinadores/{id}/restore', [CoordinadorDistritoController::class, 'restore']);
    Route::resource('coordinadores', CoordinadorDistritoController::class)
        ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Demarcaciones (Solo Presidente)
    Route::get('/demarcaciones/export', [DemarcacionController::class, 'export']);
    Route::resource('demarcaciones', DemarcacionController::class)
        ->only(['index', 'store', 'update', 'destroy', 'show']);
    Route::post('/demarcaciones/{demarcacion}/geom', [DemarcacionController::class, 'uploadGeom']);

    // Secciones Electorales de Demarcaciones (Solo Presidente)
    Route::get('/demarcaciones/{demarcacion}/secciones', [SeccionElectoralController::class, 'index']);
    Route::post('/demarcaciones/{demarcacion}/secciones', [SeccionElectoralController::class, 'store']);
    Route::put('/secciones/{seccion}', [SeccionElectoralController::class, 'update']);
    Route::delete('/secciones/{seccion}', [SeccionElectoralController::class, 'destroy']);
    Route::post('/secciones/{seccion}/geom', [SeccionElectoralController::class, 'uploadGeom']);

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
    Route::get('/promovidos/{promovido}/apoyos', [ApoyoController::class, 'index']);
    Route::post('/promovidos/{promovido}/apoyos', [ApoyoController::class, 'store']);

    // Rutas para Apoyos de Promotores, Operadores y Representantes
    Route::get('/promotores/{promotor}/apoyos', [ApoyoController::class, 'indexForUser']);
    Route::post('/promotores/{promotor}/apoyos', [ApoyoController::class, 'storeForUser']);

    Route::get('/operadores/{promotor}/apoyos', [ApoyoController::class, 'indexForUser']);
    Route::post('/operadores/{promotor}/apoyos', [ApoyoController::class, 'storeForUser']);

    Route::get('/representantes/{promotor}/apoyos', [ApoyoController::class, 'indexForUser']);
    Route::post('/representantes/{promotor}/apoyos', [ApoyoController::class, 'storeForUser']);

    // Actualizar y eliminar apoyos (compartido)
    Route::put('/apoyos/{apoyo}', [ApoyoController::class, 'update']);
    Route::delete('/apoyos/{apoyo}', [ApoyoController::class, 'destroy']);

    // Catálogos
    Route::get('/catalogos/estados', [CatalogoController::class, 'getEstados']);
    Route::get('/catalogos/municipios', [CatalogoController::class, 'getMunicipios']);
    Route::get('/catalogos/demarcaciones', [CatalogoController::class, 'getDemarcaciones']);
    Route::get('/catalogos/demarcaciones/{demarcacion}/secciones', [CatalogoController::class, 'getSecciones']);

    // OCR INE
    Route::post('/extract-ine', [IneExtractionController::class, 'extract']);

    // Mapa Territorial
    Route::get('/mapa', [WebController::class, 'mapa'])->name('mapa');

    // Bitácora / Logs de Actividad (Solo Presidente)
    Route::get('/logs', [ActivityLogController::class, 'index'])->name('logs.index');
    Route::get('/logs/{log}', [ActivityLogController::class, 'show'])->name('logs.show');
});

// Ruta comodín para la App de Promotores en React (PWA)
Route::get('/app-promotores/{any?}', function () {
    $path = public_path('app-promotores/index.html');
    if (file_exists($path)) {
        return file_get_contents($path);
    }
    abort(404, 'La aplicación de promotores no ha sido instalada o el build no se encuentra.');
})->where('any', '.*');
