<?php

use App\Http\Controllers\Api\V1\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Ruta pública para autenticación
Route::post('/v1/auth/login', [DashboardController::class, 'login']);

// Rutas protegidas
Route::middleware('auth:sanctum')->prefix('v1/dashboard')->group(function () {
    Route::get('/profile', [DashboardController::class, 'getProfile']);
    Route::get('/stats', [DashboardController::class, 'getStats']);
    Route::get('/colonia-distribution', [DashboardController::class, 'getColoniaDistribution']);
    Route::get('/promovidos-table', [DashboardController::class, 'getPromovidosTable']);
});

use App\Http\Controllers\Api\MobileSyncController;
use App\Http\Controllers\IneExtractionController;

// Rutas para App Móvil Offline-First
Route::prefix('mobile')->group(function () {
    Route::post('/login', [DashboardController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/catalogos', [MobileSyncController::class, 'getCatalogos']);
        Route::post('/sync', [MobileSyncController::class, 'syncPromovidos']);
        Route::post('/ine-extract', [IneExtractionController::class, 'extract']);
    });
});
