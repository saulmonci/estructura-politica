<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\UnresolvableMunicipalityException;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\SeccionElectoral;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class WarRoomReportService
{
    /**
     * Resuelve el ID del municipio objetivo para el War Room.
     *
     * Prioridades de resolución legítimas:
     * 1. Parámetro $municipalityId explícito (> 0).
     * 2. municipality_id del presidente ($presidenteId).
     * 3. Variables de entorno ORION_MUNICIPALITY_ID / ORION_PRESIDENTE_ID (SOLO para pruebas manuales en consola local).
     *
     * @throws UnresolvableMunicipalityException Si no se puede resolver un municipio válido.
     */
    public function resolveMunicipalityId(?int $presidenteId = null, ?int $municipalityId = null): int
    {
        // 1. Municipio explícito recibido como parámetro
        if ($municipalityId && $municipalityId > 0) {
            return $municipalityId;
        }

        // 2. Municipio asignado al presidente en la base de datos
        if ($presidenteId && $presidenteId > 0) {
            $presidente = User::withoutGlobalScopes()->find($presidenteId);
            if ($presidente?->municipality_id) {
                return (int) $presidente->municipality_id;
            }
        }

        // 3. Fallback a variables de entorno (.env) — EXCLUSIVO para pruebas manuales de consola en desarrollo local.
        // NUNCA debe considerarse un mecanismo de resolución multi-tenant en producción.
        $envMuni = env('ORION_MUNICIPALITY_ID');
        if (! empty($envMuni) && (int) $envMuni > 0) {
            return (int) $envMuni;
        }

        $envPres = env('ORION_PRESIDENTE_ID');
        if (! empty($envPres) && (int) $envPres > 0) {
            $pres = User::withoutGlobalScopes()->find((int) $envPres);
            if ($pres?->municipality_id) {
                return (int) $pres->municipality_id;
            }
        }

        // Si ninguna fuente legítima pudo resolver el municipio, fallar explícitamente sin adivinar ni mezclar tenants
        throw UnresolvableMunicipalityException::forPresidenteAndMunicipality($presidenteId, $municipalityId);
    }

    /**
     * Resumen de avance por demarcación filtrado por municipio.
     */
    public function getDemarcacionesSummary(?int $presidenteId = null, ?int $municipalityId = null): array
    {
        $targetMuniId = $this->resolveMunicipalityId($presidenteId, $municipalityId);

        $demarcacionesQuery = Demarcacion::query()->where('demarcaciones.municipality_id', $targetMuniId);

        if ($presidenteId) {
            $demarcacionesQuery->leftJoin('demarcacion_presidente', function ($join) use ($presidenteId) {
                $join->on('demarcaciones.id', '=', 'demarcacion_presidente.demarcacion_id')
                    ->where('demarcacion_presidente.presidente_id', '=', $presidenteId);
            })
                ->select(
                    'demarcaciones.id',
                    'demarcaciones.nombre',
                    'demarcaciones.municipality_id',
                    DB::raw('COALESCE(demarcacion_presidente.meta, demarcaciones.meta, 500) as target_meta')
                );
        } else {
            $demarcacionesQuery->select(
                'demarcaciones.id',
                'demarcaciones.nombre',
                'demarcaciones.municipality_id',
                DB::raw('COALESCE(demarcaciones.meta, 500) as target_meta')
            );
        }

        $demarcaciones = $demarcacionesQuery->orderBy('demarcaciones.id')->get();

        if ($demarcaciones->isEmpty()) {
            return [];
        }

        $demIds = $demarcaciones->pluck('id')->all();

        $stats = Promovido::withoutGlobalScopes()
            ->select('demarcacion_id', DB::raw('count(*) as total'), DB::raw('max(created_at) as last_at'))
            ->whereIn('demarcacion_id', $demIds)
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->groupBy('demarcacion_id')
            ->get()
            ->keyBy('demarcacion_id');

        // RD, Operadores y Promotores asignados a cada demarcación también cuentan como votos
        // potenciales de la campaña, no solo los Promovidos capturados en campo.
        $structureCounts = DB::table('users')
            ->select(DB::raw('COALESCE(demarcacion_id, demarcacion_asignada_id) as dem_id'), DB::raw('count(*) as total'))
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->whereIn('role', ['rd', 'operador', 'promotor'])
            ->whereNull('deleted_at')
            ->where(function ($q) use ($demIds) {
                $q->whereIn('demarcacion_id', $demIds)
                    ->orWhereIn('demarcacion_asignada_id', $demIds);
            })
            ->groupBy(DB::raw('COALESCE(demarcacion_id, demarcacion_asignada_id)'))
            ->pluck('total', 'dem_id');

        $summary = [];
        $now = Carbon::now();

        foreach ($demarcaciones as $dem) {
            $row = $stats->get($dem->id);
            $estructuraDem = (int) ($structureCounts[$dem->id] ?? 0);
            $totalCapturado = ($row ? (int) $row->total : 0) + $estructuraDem;
            $meta = (int) $dem->target_meta;
            if ($meta <= 0) {
                $meta = 1;
            }

            $porcentaje = min(100, round(($totalCapturado / $meta) * 100));

            // Última fecha de captura
            $lastCapture = $row?->last_at;
            $lastCaptureCarbon = $lastCapture ? Carbon::parse($lastCapture) : null;

            $diasSinCaptura = null;
            if ($lastCaptureCarbon) {
                $diasSinCaptura = (int) $lastCaptureCarbon->diffInDays($now);
            }

            // Determinar estado / semáforo
            if ($totalCapturado >= $meta) {
                $estado = 'META_CUMPLIDA';
                $emoji = '✅';
                $textoEstado = 'META CUMPLIDA';
            } elseif ($totalCapturado === 0) {
                if ($diasSinCaptura === null || $diasSinCaptura >= 3) {
                    $estado = 'SIN_AVANCE';
                    $emoji = '🔴';
                    $diasTexto = ($diasSinCaptura !== null && $diasSinCaptura > 0) ? " - {$diasSinCaptura} días sin captura" : '';
                    $textoEstado = 'SIN AVANCE'.$diasTexto;
                } else {
                    $estado = 'CRITICO';
                    $emoji = '🔴';
                    $textoEstado = 'CRÍTICO';
                }
            } else {
                $faltan = max(0, $meta - $totalCapturado);
                $estado = 'EN_PROCESO';
                $emoji = '🟡';
                $textoEstado = "Faltan {$faltan}";
            }

            $summary[] = [
                'id' => $dem->id,
                'nombre' => $dem->nombre,
                'meta' => $meta,
                'capturados' => $totalCapturado,
                'porcentaje' => $porcentaje,
                'estado' => $estado,
                'emoji' => $emoji,
                'texto_estado' => $textoEstado,
                'ultima_captura' => $lastCaptureCarbon,
                'dias_sin_captura' => $diasSinCaptura,
            ];
        }

        return $summary;
    }

    /**
     * Total capturado hoy y el mejor operador de la jornada para el municipio.
     */
    public function getTodayStats(?int $presidenteId = null, ?int $municipalityId = null): array
    {
        $targetMuniId = $this->resolveMunicipalityId($presidenteId, $municipalityId);
        $todayStart = Carbon::today();

        $queryHoy = Promovido::withoutGlobalScopes()
            ->where(function ($q) use ($targetMuniId) {
                $q->where('municipality_id', $targetMuniId)
                    ->orWhereIn('demarcacion_id', function ($sub) use ($targetMuniId) {
                        $sub->select('id')->from('demarcaciones')->where('municipality_id', $targetMuniId);
                    });
            })
            ->where('created_at', '>=', $todayStart);

        if ($presidenteId) {
            $queryHoy->where('presidente_id', $presidenteId);
        }

        $totalHoy = (int) $queryHoy->count();

        // Operador del día
        $topOperatorQuery = DB::table('promovidos')
            ->join('users', 'promovidos.promotor_id', '=', 'users.id')
            ->select('users.id', 'users.name', 'users.demarcacion_id', DB::raw('count(promovidos.id) as total_capturas'))
            ->whereNull('promovidos.deleted_at')
            ->whereNull('users.deleted_at')
            ->where(function ($q) use ($targetMuniId) {
                $q->where('promovidos.municipality_id', $targetMuniId)
                    ->orWhereIn('promovidos.demarcacion_id', function ($sub) use ($targetMuniId) {
                        $sub->select('id')->from('demarcaciones')->where('municipality_id', $targetMuniId);
                    });
            });

        if ($presidenteId) {
            $topOperatorQuery->where('promovidos.presidente_id', $presidenteId);
        }

        // Primero buscar hoy
        $topToday = (clone $topOperatorQuery)
            ->where('promovidos.created_at', '>=', $todayStart)
            ->groupBy('users.id', 'users.name', 'users.demarcacion_id')
            ->orderByDesc('total_capturas')
            ->first();

        $operadorNombre = 'Sin actividad hoy';
        $demarcacionNombre = '';

        if ($topToday && $topToday->total_capturas > 0) {
            $operadorNombre = $topToday->name;
            if ($topToday->demarcacion_id) {
                $dem = Demarcacion::find($topToday->demarcacion_id);
                $demarcacionNombre = $dem ? "Dem {$dem->id}" : '';
            }
        } else {
            // Si hoy van 0 capturas, buscar el más activo recientemente
            $recentOp = (clone $topOperatorQuery)
                ->where('promovidos.created_at', '>=', Carbon::now()->subDays(7))
                ->groupBy('users.id', 'users.name', 'users.demarcacion_id')
                ->orderByDesc('total_capturas')
                ->first();

            if ($recentOp) {
                $operadorNombre = $recentOp->name;
                if ($recentOp->demarcacion_id) {
                    $dem = Demarcacion::find($recentOp->demarcacion_id);
                    $demarcacionNombre = $dem ? "Dem {$dem->id}" : '';
                }
            }
        }

        return [
            'total_capturado_hoy' => $totalHoy,
            'operador_del_dia' => $operadorNombre,
            'operador_demarcacion' => $demarcacionNombre,
        ];
    }

    /**
     * Conteo total de toda la estructura dada de alta para el presidente: coordinadores de
     * distrito, RDs, operadores, promotores y promovidos. Todos representan votos potenciales
     * de la campaña, no solo los promovidos capturados en campo.
     */
    public function getStructureTotals(?int $presidenteId = null): array
    {
        $porRol = DB::table('users')
            ->select('role', DB::raw('count(*) as total'))
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->whereIn('role', ['coordinador_distrito', 'rd', 'operador', 'promotor'])
            ->whereNull('deleted_at')
            ->groupBy('role')
            ->pluck('total', 'role');

        $coordinadores = (int) ($porRol['coordinador_distrito'] ?? 0);
        $rds = (int) ($porRol['rd'] ?? 0);
        $operadores = (int) ($porRol['operador'] ?? 0);
        $promotores = (int) ($porRol['promotor'] ?? 0);

        $promovidos = (int) Promovido::withoutGlobalScopes()
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->count();

        return [
            'coordinadores' => $coordinadores,
            'rds' => $rds,
            'operadores' => $operadores,
            'promotores' => $promotores,
            'promovidos' => $promovidos,
            'total' => $coordinadores + $rds + $operadores + $promotores + $promovidos,
        ];
    }

    /**
     * Construye el texto exacto del reporte matutino para WhatsApp.
     */
    public function buildDailyReportMessage(?int $presidenteId = null, ?int $municipalityId = null, ?string $tituloMunicipio = null): string
    {
        $targetMuniId = $this->resolveMunicipalityId($presidenteId, $municipalityId);
        $municipioNombre = $tituloMunicipio;

        if (! $municipioNombre) {
            $muniObj = Municipality::find($targetMuniId);
            $municipioNombre = $muniObj?->nombre ?: 'Bahía de Banderas';
        }

        $fechaFormateada = Carbon::now()->locale('es')->isoFormat('DD MMMM');
        $fechaFormateada = ucfirst($fechaFormateada);

        $summary = $this->getDemarcacionesSummary($presidenteId, $targetMuniId);
        $todayStats = $this->getTodayStats($presidenteId, $targetMuniId);

        $lines = [];
        $lines[] = "🚨 *REPORTE ORION - {$municipioNombre} - {$fechaFormateada}*";

        foreach ($summary as $item) {
            $demName = $item['nombre'];
            // Con bandera /iu para soportar Demarcación con acento en UTF-8
            if (preg_match('/(?:Demarcaci[oó]n|Dem)\s*(\d+)/iu', $demName, $matches)) {
                $demLabel = "Dem {$matches[1]}";
            } else {
                $demLabel = $demName;
            }

            $line = "📍 *{$demLabel}*: {$item['porcentaje']}% ({$item['capturados']}/{$item['meta']}) {$item['emoji']} {$item['texto_estado']}";
            $lines[] = $line;
        }

        $lines[] = "Total capturado hoy: *{$todayStats['total_capturado_hoy']}*";

        $opTexto = $todayStats['operador_del_dia'];
        if ($todayStats['operador_demarcacion']) {
            $opTexto .= " - {$todayStats['operador_demarcacion']}";
        }
        $lines[] = "Operador del día: *{$opTexto}*";

        $estructura = $this->getStructureTotals($presidenteId);
        $lines[] = "👥 *Estructura total*: {$estructura['total']} (Coord: {$estructura['coordinadores']}, RD: {$estructura['rds']}, Operadores: {$estructura['operadores']}, Promotores: {$estructura['promotores']}, Promovidos: {$estructura['promovidos']})";

        return implode("\n", $lines);
    }

    /**
     * Detalle específico para el comando "Reporte Dem X" acotado al municipio.
     */
    public function getDemarcacionReport(int|string $demIdentificador, ?int $presidenteId = null, ?int $municipalityId = null): string
    {
        $targetMuniId = $this->resolveMunicipalityId($presidenteId, $municipalityId);

        $demQuery = Demarcacion::query()->where('municipality_id', $targetMuniId);

        if (is_numeric($demIdentificador)) {
            $dem = $demQuery->where(function ($q) use ($demIdentificador) {
                $q->where('id', (int) $demIdentificador)
                    ->orWhere('nombre', 'like', "%{$demIdentificador}%");
            })->first();
        } else {
            $dem = $demQuery->where('nombre', 'like', "%{$demIdentificador}%")->first();
        }

        if (! $dem) {
            return "❌ No encontré información para la Demarcación {$demIdentificador} en este municipio.";
        }

        $meta = $dem->getMetaForPresidente($presidenteId);
        if ($meta <= 0) {
            $meta = 1;
        }

        $promovidosQuery = Promovido::withoutGlobalScopes()
            ->where('demarcacion_id', $dem->id);

        if ($presidenteId) {
            $promovidosQuery->where('presidente_id', $presidenteId);
        }

        // RD, Operadores y Promotores asignados a esta demarcación también cuentan como votos
        // potenciales de la campaña, no solo los Promovidos capturados en campo.
        $estructuraQuery = User::withoutGlobalScopes()
            ->where(function ($q) use ($dem) {
                $q->where('demarcacion_id', $dem->id)
                    ->orWhere('demarcacion_asignada_id', $dem->id);
            })
            ->whereIn('role', [UserRole::RD, UserRole::OPERADOR, UserRole::PROMOTOR]);

        if ($presidenteId) {
            $estructuraQuery->where('presidente_id', $presidenteId);
        }

        $totalCapturado = (int) $promovidosQuery->count() + (int) $estructuraQuery->count();
        $porcentaje = min(100, round(($totalCapturado / $meta) * 100));
        $faltan = max(0, $meta - $totalCapturado);

        // Operador / RD asignado a esta demarcación
        $operador = User::withoutGlobalScopes()
            ->where(function ($q) use ($dem) {
                $q->where('demarcacion_id', $dem->id)
                    ->orWhere('demarcacion_asignada_id', $dem->id);
            })
            ->whereIn('role', [UserRole::OPERADOR, UserRole::RD, UserRole::PROMOTOR])
            ->first();

        $operadorNombre = $operador ? $operador->name : 'Sin asignar';

        // Última captura
        $ultimaCaptura = (clone $promovidosQuery)->latest('created_at')->first();
        $tiempoUltimaCaptura = 'Sin capturas';
        if ($ultimaCaptura) {
            $tiempoUltimaCaptura = Carbon::parse($ultimaCaptura->created_at)->diffForHumans();
        }

        // Desglose por sección electoral (hasta 3 secciones principales)
        $secciones = SeccionElectoral::where('demarcacion_id', $dem->id)->orderBy('numero')->take(3)->get();
        $seccionesInfo = [];

        if ($secciones->isNotEmpty()) {
            $numeros = $secciones->pluck('numero')->all();

            $secStats = Promovido::withoutGlobalScopes()
                ->select('seccion_electoral', DB::raw('count(*) as total'))
                ->whereIn('seccion_electoral', $numeros)
                ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
                ->groupBy('seccion_electoral')
                ->pluck('total', 'seccion_electoral')
                ->all();

            foreach ($secciones as $seccion) {
                $secCount = (int) ($secStats[$seccion->numero] ?? ($secStats[(string) $seccion->numero] ?? 0));
                $secMeta = $seccion->meta ?? 2;
                $seccionesInfo[] = "Sección {$seccion->numero}: {$secCount}/{$secMeta}";
            }
        }

        $seccionesTexto = ! empty($seccionesInfo) ? ' - '.implode(', ', $seccionesInfo) : '';

        $respuesta = "📍 *Dem {$dem->id}*: {$porcentaje}%{$seccionesTexto} - Te faltan *{$faltan}*.\n";
        $respuesta .= "👤 *Operador*: {$operadorNombre}\n";
        $respuesta .= "⏱️ *Última captura*: {$tiempoUltimaCaptura}";

        return $respuesta;
    }

    /**
     * Lista de quiénes no han capturado hoy acotado al municipio.
     */
    public function getInactiveTodaySummary(?int $presidenteId = null, ?int $municipalityId = null): string
    {
        $targetMuniId = $this->resolveMunicipalityId($presidenteId, $municipalityId);
        $todayStart = Carbon::today();

        $demarcaciones = Demarcacion::where('municipality_id', $targetMuniId)->orderBy('id')->get();
        if ($demarcaciones->isEmpty()) {
            return '👏 ¡Excelente noticia! Todas las demarcaciones han registrado capturas el día de hoy.';
        }

        $demIds = $demarcaciones->pluck('id')->all();

        $activeDemarcaciones = Promovido::withoutGlobalScopes()
            ->select('demarcacion_id')
            ->whereIn('demarcacion_id', $demIds)
            ->where('created_at', '>=', $todayStart)
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->groupBy('demarcacion_id')
            ->pluck('demarcacion_id')
            ->flip()
            ->all();

        $inactivas = [];
        foreach ($demarcaciones as $dem) {
            if (! isset($activeDemarcaciones[$dem->id])) {
                $inactivas[] = "Dem {$dem->id}";
            }
        }

        if (empty($inactivas)) {
            return '👏 ¡Excelente noticia! Todas las demarcaciones han registrado capturas el día de hoy.';
        }

        if (count($inactivas) <= 5) {
            return '⚠️ *'.implode(', ', $inactivas).'* sin captura hoy.';
        }

        return '⚠️ Las siguientes demarcaciones están sin captura hoy: *'.implode(', ', array_slice($inactivas, 0, 6)).'* (y '.(count($inactivas) - 6).' más).';
    }

    /**
     * Detección de demarcaciones sin movimiento en las últimas 24h acotado al municipio.
     */
    public function checkInactivityAlerts(?int $presidenteId = null, ?int $municipalityId = null): array
    {
        $targetMuniId = $this->resolveMunicipalityId($presidenteId, $municipalityId);
        $cutoff = Carbon::now()->subHours(24);

        $demarcacionesQuery = Demarcacion::query()->where('demarcaciones.municipality_id', $targetMuniId);

        if ($presidenteId) {
            $demarcacionesQuery->leftJoin('demarcacion_presidente', function ($join) use ($presidenteId) {
                $join->on('demarcaciones.id', '=', 'demarcacion_presidente.demarcacion_id')
                    ->where('demarcacion_presidente.presidente_id', '=', $presidenteId);
            })
                ->select(
                    'demarcaciones.id',
                    'demarcaciones.nombre',
                    'demarcaciones.municipality_id',
                    DB::raw('COALESCE(demarcacion_presidente.meta, demarcaciones.meta, 500) as target_meta')
                );
        } else {
            $demarcacionesQuery->select(
                'demarcaciones.id',
                'demarcaciones.nombre',
                'demarcaciones.municipality_id',
                DB::raw('COALESCE(demarcaciones.meta, 500) as target_meta')
            );
        }

        $demarcaciones = $demarcacionesQuery->orderBy('demarcaciones.id')->get();
        if ($demarcaciones->isEmpty()) {
            return [];
        }

        $demIds = $demarcaciones->pluck('id')->all();

        // 1. Estadísticas agregadas de promovidos en una sola consulta
        $stats = Promovido::withoutGlobalScopes()
            ->select('demarcacion_id', DB::raw('count(*) as total'), DB::raw('max(created_at) as last_at'))
            ->whereIn('demarcacion_id', $demIds)
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->groupBy('demarcacion_id')
            ->get()
            ->keyBy('demarcacion_id');

        // 2. Carga por lote de operadores RD asignados
        $rds = User::withoutGlobalScopes()
            ->where('role', UserRole::RD)
            ->where(function ($q) use ($demIds) {
                $q->whereIn('demarcacion_id', $demIds)
                    ->orWhereIn('demarcacion_asignada_id', $demIds);
            })
            ->get();

        $rdMap = [];
        foreach ($rds as $rd) {
            if ($rd->demarcacion_id && ! isset($rdMap[$rd->demarcacion_id])) {
                $rdMap[$rd->demarcacion_id] = $rd->name;
            }
            if ($rd->demarcacion_asignada_id && ! isset($rdMap[$rd->demarcacion_asignada_id])) {
                $rdMap[$rd->demarcacion_asignada_id] = $rd->name;
            }
        }

        $alertas = [];

        foreach ($demarcaciones as $dem) {
            $row = $stats->get($dem->id);
            $total = $row ? (int) $row->total : 0;
            $meta = (int) $dem->target_meta;
            if ($meta <= 0) {
                $meta = 1;
            }

            if ($total >= $meta) {
                continue;
            }

            $ultimaCaptura = $row?->last_at;

            if (! $ultimaCaptura || Carbon::parse($ultimaCaptura)->lessThan($cutoff)) {
                $rdNombre = $rdMap[$dem->id] ?? 'RD';

                $alertas[] = [
                    'demarcacion_id' => $dem->id,
                    'demarcacion_nombre' => $dem->nombre,
                    'rd_nombre' => $rdNombre,
                    'mensaje' => "⚠️ Alerta: *Dem {$dem->id}* sin movimiento desde ayer. ¿Contacto a {$rdNombre}?",
                ];
            }
        }

        return $alertas;
    }
}
