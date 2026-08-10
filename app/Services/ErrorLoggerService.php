<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

class ErrorLoggerService
{
    /**
     * Lista de clases de excepciones que deben ignorarse para no saturar la bitácora.
     */
    protected static array $ignoredExceptions = [
        \Illuminate\Validation\ValidationException::class,
        \Illuminate\Auth\AuthenticationException::class,
        \Illuminate\Auth\Access\AuthorizationException::class,
        \Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
        \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException::class,
        \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException::class,
        \Illuminate\Database\Eloquent\ModelNotFoundException::class,
        \Illuminate\Session\TokenMismatchException::class,
    ];

    /**
     * Claves sensibles que deben enmascararse en los payloads de las peticiones.
     */
    protected static array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'bearer',
        'authorization',
        'access_token',
        'refresh_token',
        'secret',
        'pin',
        'credit_card',
        'cvv',
        'api_key',
    ];

    /**
     * Determina si una excepción debe ser ignorada.
     */
    public static function shouldIgnore(Throwable $e): bool
    {
        foreach (self::$ignoredExceptions as $ignored) {
            if ($e instanceof $ignored) {
                return true;
            }
        }

        // Si es una excepción HTTP con código menor a 500 (ej. 401, 403, 404, 422), también ignorar
        if (method_exists($e, 'getStatusCode') && $e->getStatusCode() < 500) {
            return true;
        }

        return false;
    }

    /**
     * Registra una excepción en la tabla de activity_logs de forma segura.
     */
    public static function logException(Throwable $e, ?Request $request = null, array $additionalContext = []): ?ActivityLog
    {
        if (self::shouldIgnore($e)) {
            return null;
        }

        try {
            $req = $request ?: request();
            $user = Auth::user();

            $userIdentifier = self::resolveUserIdentifier($user);
            $presidenteId = self::resolvePresidenteId($user);

            $sanitizedPayload = self::sanitizeData($req ? $req->except(self::$sensitiveKeys) : []);
            $sanitizedQuery = self::sanitizeData($req ? $req->query() : []);

            $traceLines = array_slice(explode("\n", $e->getTraceAsString()), 0, 40);

            $statusCode = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
            $exceptionClass = get_class($e);
            $message = $e->getMessage() ?: class_basename($exceptionClass);

            // Representación concisa para la vista de tabla
            $representation = sprintf('[%s] %s', class_basename($exceptionClass), mb_substr($message, 0, 180));

            return ActivityLog::create([
                'user_id' => $user?->id,
                'user_identifier' => $userIdentifier,
                'action' => 'error',
                'model_type' => $exceptionClass,
                'model_friendly_name' => 'Error del Sistema',
                'model_id' => null,
                'model_representation' => $representation,
                'original_data' => [
                    'url' => $req?->fullUrl(),
                    'path' => $req?->path(),
                    'method' => $req?->method(),
                    'route_name' => $req?->route()?->getName(),
                    'status_code' => $statusCode,
                    'payload' => $sanitizedPayload,
                    'query' => $sanitizedQuery,
                ],
                'changed_data' => [
                    'exception_class' => $exceptionClass,
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'code' => $e->getCode(),
                    'context' => self::sanitizeData($additionalContext),
                    'trace' => $traceLines,
                ],
                'ip_address' => $req?->ip(),
                'user_agent' => $req?->userAgent(),
                'presidente_id' => $presidenteId,
            ]);
        } catch (Throwable $loggingError) {
            // Mecanismo de emergencia para nunca interrumpir la aplicación si falla la base de datos
            Log::error('Error logger failed to persist to activity_logs: ' . $loggingError->getMessage(), [
                'original_exception' => $e->getMessage(),
                'logging_error' => $loggingError,
            ]);
            return null;
        }
    }

    /**
     * Registra un error de negocio o proceso controlado (ej. sincronización móvil, importación).
     */
    public static function logManualError(
        string $message,
        string $module = 'Sistema',
        array $context = [],
        ?Throwable $e = null,
        ?Request $request = null
    ): ?ActivityLog {
        try {
            $req = $request ?: request();
            $user = Auth::user();

            $userIdentifier = self::resolveUserIdentifier($user);
            $presidenteId = self::resolvePresidenteId($user);

            $sanitizedPayload = self::sanitizeData($req ? $req->except(self::$sensitiveKeys) : []);
            $traceLines = $e ? array_slice(explode("\n", $e->getTraceAsString()), 0, 40) : [];

            $representation = mb_substr($message, 0, 200);

            return ActivityLog::create([
                'user_id' => $user?->id,
                'user_identifier' => $userIdentifier,
                'action' => 'error',
                'model_type' => $e ? get_class($e) : 'ManualError',
                'model_friendly_name' => $module,
                'model_id' => $context['record_id'] ?? $context['local_id'] ?? null,
                'model_representation' => $representation,
                'original_data' => [
                    'url' => $req?->fullUrl(),
                    'path' => $req?->path(),
                    'method' => $req?->method(),
                    'status_code' => 500,
                    'payload' => $sanitizedPayload,
                ],
                'changed_data' => [
                    'message' => $message,
                    'exception_class' => $e ? get_class($e) : null,
                    'file' => $e ? $e->getFile() : null,
                    'line' => $e ? $e->getLine() : null,
                    'context' => self::sanitizeData($context),
                    'trace' => $traceLines,
                ],
                'ip_address' => $req?->ip(),
                'user_agent' => $req?->userAgent(),
                'presidente_id' => $presidenteId,
            ]);
        } catch (Throwable $loggingError) {
            Log::error('Error in logManualError: ' . $loggingError->getMessage(), [
                'original_message' => $message,
                'logging_error' => $loggingError,
            ]);
            return null;
        }
    }

    /**
     * Resuelve el identificador legible del usuario.
     */
    protected static function resolveUserIdentifier($user): string
    {
        if (!$user) {
            return 'Sistema / Anónimo';
        }

        $fullName = trim(($user->nombre ?? '') . ' ' . ($user->apellidos ?? ''));
        if (empty($fullName)) {
            $fullName = $user->name ?? '';
        }
        $userRoleStr = $user->role instanceof \BackedEnum ? $user->role->value : ($user->role ?? '');

        return sprintf('%s - %s (%s)', $user->id, $fullName, $userRoleStr);
    }

    /**
     * Resuelve el ID del presidente asignado.
     */
    protected static function resolvePresidenteId($user): ?int
    {
        if (!$user) {
            return null;
        }

        if (method_exists($user, 'getPresidenteId')) {
            return $user->getPresidenteId();
        }

        return $user->presidente_id ?? null;
    }

    /**
     * Sanitiza de manera recursiva arrays u objetos para eliminar datos sensibles y binarios/base64 gigantes.
     */
    public static function sanitizeData(mixed $data): mixed
    {
        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $value) {
                $lowerKey = strtolower((string) $key);
                $isSensitive = false;
                foreach (self::$sensitiveKeys as $sensitive) {
                    if (str_contains($lowerKey, $sensitive)) {
                        $isSensitive = true;
                        break;
                    }
                }

                if ($isSensitive) {
                    $cleaned[$key] = '********';
                } elseif (is_string($value) && str_starts_with($value, 'data:image/') && strlen($value) > 200) {
                    $cleaned[$key] = '[IMAGEN_BASE64_OMITIDA ' . round(strlen($value) / 1024, 1) . 'KB]';
                } elseif (is_array($value) || is_object($value)) {
                    $cleaned[$key] = self::sanitizeData($value);
                } else {
                    $cleaned[$key] = $value;
                }
            }
            return $cleaned;
        }

        if (is_object($data)) {
            if (method_exists($data, 'toArray')) {
                return self::sanitizeData($data->toArray());
            }
            return self::sanitizeData((array) $data);
        }

        return $data;
    }
}
