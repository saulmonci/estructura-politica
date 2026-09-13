<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

// Agente ORION: Reporte matutino de las 8:00 AM
Schedule::command('orion:send-daily-report')->dailyAt('08:00');

// Agente ORION: Detección de inactividad cada hora durante el día
Schedule::command('orion:check-inactivity')->hourly()->between('08:00', '21:00');

