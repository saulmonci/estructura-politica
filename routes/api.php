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
