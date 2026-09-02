<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = AuditLog::query();

        // ── Department scoping ────────────────────────────────────────────────
        if ($user->hasRole('admin')) {
            // Admin can filter by a specific department or see all
            if ($request->filled('department')) {
                $query->where('department', $request->input('department'));
            }
            // No filter = all departments
        } elseif ($user->hasAnyRole(['marketing_supervisor', 'marketing_coordinator'])) {
            $query->where('department', 'marketing');
        } else {
            // AV-IT roles (supervisor, coordinator)
            $query->where('department', 'av_it');
        }

        // ── Text search ───────────────────────────────────────────────────────
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('start_date')) {
             $query->whereDate('created_at', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
             $query->whereDate('created_at', '<=', $request->input('end_date'));
        }

        $logs = $query->latest()->paginate(15);

        return response()->json($logs);
    }
}
