<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Helpers\AuditLogger;

class PositionController extends Controller
{
    /**
     * Display a listing of positions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Position::query();

        // Filter by active status if specified
        if ($request->has('active')) {
            if ($request->boolean('active')) {
                $query->active();
            } else {
                $query->inactive();
            }
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $positions = $query->orderBy('name')->get();

        return response()->json([
            'message' => 'Positions retrieved successfully',
            'positions' => $positions
        ]);
    }

    /**
     * Store a newly created position.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:positions,name',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean'
        ]);

        $position = Position::create($request->only(['name', 'description', 'is_active']));

        AuditLogger::log('Position Created', ['position_id' => $position->id, 'name' => $position->name]);

        return response()->json([
            'message' => 'Position created successfully',
            'position' => $position
        ], 201);
    }

    /**
     * Display the specified position.
     */
    public function show(Position $position): JsonResponse
    {
        return response()->json([
            'position' => $position
        ]);
    }

    /**
     * Update the specified position.
     */
    public function update(Request $request, Position $position): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('positions')->ignore($position->id)],
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean'
        ]);

        $position->update($request->only(['name', 'description', 'is_active']));

        AuditLogger::log('Position Updated', ['position_id' => $position->id, 'name' => $position->name]);

        return response()->json([
            'message' => 'Position updated successfully',
            'position' => $position->fresh()
        ]);
    }

    /**
     * Remove the specified position.
     */
    public function destroy(Position $position): JsonResponse
    {
        // Check if position is in use before deleting
        if ($position->isInUse()) {
            return response()->json([
                'message' => 'Cannot delete position that is currently assigned to users',
                'error' => 'Position is in use'
            ], 422);
        }

        $position->delete();

        AuditLogger::log('Position Deleted', ['position_id' => $position->id, 'name' => $position->name]);

        return response()->json([
            'message' => 'Position deleted successfully'
        ]);
    }

    /**
     * Get all active positions for dropdowns.
     */
    public function active(): JsonResponse
    {
        $positions = Position::active()->orderBy('name')->get(['id', 'name']);

        return response()->json([
            'positions' => $positions
        ]);
    }
}
