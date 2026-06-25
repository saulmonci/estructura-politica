<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    /**
     * Display a listing of activity logs.
     */
    public function index(Request $request)
    {
        // Restrict access to President only
        abort_if($request->user()->role !== 'presidente', 403, 'Acceso denegado. Solo el Presidente puede acceder a esta información.');

        $query = ActivityLog::where('presidente_id', $request->user()->id);

        // Global search
        if ($search = $request->input('search')) {
            $searchLower = strtolower($search);
            $query->where(function ($q) use ($searchLower, $search) {
                $q->whereRaw('LOWER(user_identifier) LIKE ?', ["%{$searchLower}%"])
                  ->orWhereRaw('LOWER(action) LIKE ?', ["%{$searchLower}%"])
                  ->orWhereRaw('LOWER(model_friendly_name) LIKE ?', ["%{$searchLower}%"])
                  ->orWhereRaw('LOWER(model_representation) LIKE ?', ["%{$searchLower}%"])
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        // Action filter (created, updated, deleted)
        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        // Module filter (model_friendly_name)
        if ($module = $request->input('model_friendly_name')) {
            $query->where('model_friendly_name', $module);
        }

        // Date range filter (from ProTable valueType: dateRange)
        if ($createdAt = $request->input('created_at')) {
            if (is_array($createdAt) && count($createdAt) === 2) {
                $query->whereBetween('created_at', [$createdAt[0] . ' 00:00:00', $createdAt[1] . ' 23:59:59']);
            }
        }

        // Sorting
        if ($sortField = $request->input('sort_field')) {
            $sortDirection = $request->input('sort_direction', 'asc');
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->latest();
        }

        $perPage = min((int) $request->input('per_page', 10), 100);
        $logs = $query->paginate($perPage)->withQueryString();

        // If requested via axios/ajax (ProTable async request)
        if ($request->wantsJson()) {
            return response()->json($logs);
        }

        // Render inertia page on initial load
        return Inertia::render('ActivityLogs/Index', [
            'logs' => $logs
        ]);
    }

    /**
     * Display the specified activity log.
     */
    public function show(Request $request, string $id)
    {
        abort_if($request->user()->role !== 'presidente', 403, 'Acceso denegado.');

        $log = ActivityLog::where('presidente_id', $request->user()->id)->findOrFail($id);

        return response()->json($log);
    }
}
