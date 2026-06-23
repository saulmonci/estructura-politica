<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebController;
use App\Http\Controllers\RepresentanteDemarcacionController;
use App\Http\Controllers\OperadorController;
use App\Http\Controllers\PromotorController;
use App\Http\Controllers\PromovidoController;
use App\Http\Controllers\DemarcacionController;

Route::get('/', [WebController::class, 'showLogin'])->name('login');
Route::post('/login', [WebController::class, 'login']);
Route::post('/logout', [WebController::class, 'logout'])->name('logout');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [WebController::class, 'dashboard'])->name('dashboard');
    
    // CRUD para Demarcaciones (Solo Presidente)
    Route::get('/demarcaciones/export', [DemarcacionController::class, 'export']);
    Route::resource('demarcaciones', DemarcacionController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Representantes de Demarcación (Solo Presidente)
    Route::get('/representantes/export', [RepresentanteDemarcacionController::class, 'export']);
    Route::resource('representantes', RepresentanteDemarcacionController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Operadores (Solo Presidente y RD)
    Route::get('/operadores/export', [OperadorController::class, 'export']);
    Route::resource('operadores', OperadorController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Promotores (Solo Presidente, RD y Operador)
    Route::get('/promotores/export', [PromotorController::class, 'export']);
    Route::resource('promotores', PromotorController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // CRUD para Promovidos (Todos)
    Route::get('/promovidos/export', [PromovidoController::class, 'export']);
    Route::resource('promovidos', PromovidoController::class)
         ->only(['index', 'store', 'update', 'destroy', 'show']);

    // Rutas para Apoyos de Promovidos
    Route::get('/promovidos/{promovido}/apoyos', [App\Http\Controllers\ApoyoController::class, 'index']);
    Route::post('/promovidos/{promovido}/apoyos', [App\Http\Controllers\ApoyoController::class, 'store']);

    // Rutas para Apoyos de Promotores
    Route::get('/promotores/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'indexForUser']);
    Route::post('/promotores/{promotor}/apoyos', [App\Http\Controllers\ApoyoController::class, 'storeForUser']);

    // Actualizar y eliminar apoyos (compartido)
    Route::put('/apoyos/{apoyo}', [App\Http\Controllers\ApoyoController::class, 'update']);
    Route::delete('/apoyos/{apoyo}', [App\Http\Controllers\ApoyoController::class, 'destroy']);

    // Catálogos
    Route::get('/catalogos/demarcaciones', [App\Http\Controllers\CatalogoController::class, 'getDemarcaciones']);
    Route::get('/catalogos/demarcaciones/{demarcacion}/secciones', [App\Http\Controllers\CatalogoController::class, 'getSecciones']);

    // Mapa Territorial
    Route::get('/mapa', [WebController::class, 'mapa'])->name('mapa');
});
