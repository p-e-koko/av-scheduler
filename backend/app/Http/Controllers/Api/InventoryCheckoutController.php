<?php
/**
 * Unified Controller for Inventory Checkouts.
 * Concept: Union equipment_checkouts and cable_checkouts for a single view.
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CableCheckout;
use App\Models\EquipmentCheckout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryCheckoutController extends Controller
{
    /**
     * List all checkout records (Equipment + Cables).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 20);
        $status = $request->get('status');
        $search = $request->get('search');

        // We use a query builder to handle the union
        // Select common fields and add a discriminator
        
        $equipmentQuery = DB::table('equipment_checkouts')
            ->join('equipment', 'equipment_checkouts.equipment_id', '=', 'equipment.id')
            ->join('users', 'equipment_checkouts.user_id', '=', 'users.id')
            ->select(
                'equipment_checkouts.id',
                'equipment_checkouts.user_id',
                'users.name as user_name',
                'equipment.name as item_name',
                'equipment.barcode as barcode',
                'equipment_checkouts.event_note',
                'equipment_checkouts.checked_out_at',
                'equipment_checkouts.returned_at',
                'equipment_checkouts.return_note',
                'equipment_checkouts.deleted_at',
                DB::raw("'equipment' as item_type"),
                DB::raw('1 as quantity')
            );

        $cableQuery = DB::table('cable_checkouts')
            ->join('cables', 'cable_checkouts.cable_id', '=', 'cables.id')
            ->join('users', 'cable_checkouts.user_id', '=', 'users.id')
            ->select(
                'cable_checkouts.id',
                'cable_checkouts.user_id',
                'users.name as user_name',
                'cables.name as item_name',
                'cables.barcode as barcode',
                'cable_checkouts.event_note',
                'cable_checkouts.checked_out_at',
                'cable_checkouts.returned_at',
                'cable_checkouts.return_note',
                'cable_checkouts.deleted_at',
                DB::raw("'cable' as item_type"),
                'cable_checkouts.quantity_checked_out as quantity'
            );

        // Filters
        if ($status === 'active') {
            $equipmentQuery->whereNull('equipment_checkouts.returned_at');
            $cableQuery->whereNull('cable_checkouts.returned_at');
        } elseif ($status === 'returned') {
            $equipmentQuery->whereNotNull('equipment_checkouts.returned_at');
            $cableQuery->whereNotNull('cable_checkouts.returned_at');
        }

        if ($search) {
            $equipmentQuery->where(function ($q) use ($search) {
                $q->where('equipment.name', 'like', "%{$search}%")
                  ->orWhere('equipment.barcode', 'like', "%{$search}%")
                  ->orWhere('users.name', 'like', "%{$search}%")
                  ->orWhere('equipment_checkouts.event_note', 'like', "%{$search}%");
            });
            $cableQuery->where(function ($q) use ($search) {
                $q->where('cables.name', 'like', "%{$search}%")
                  ->orWhere('cables.barcode', 'like', "%{$search}%")
                  ->orWhere('users.name', 'like', "%{$search}%")
                  ->orWhere('cable_checkouts.event_note', 'like', "%{$search}%");
            });
        }

        // Only trash if requested or not? The original EquipmentCheckout index handled trashed separately.
        // For simplicity, we'll follow the current tab logic: if tab is trashed, we show ONLY trashed.
        if ($request->get('tab') === 'trashed') {
            $equipmentQuery->whereNotNull('equipment_checkouts.deleted_at');
            $cableQuery->whereNotNull('cable_checkouts.deleted_at');
        } else {
            $equipmentQuery->whereNull('equipment_checkouts.deleted_at');
            $cableQuery->whereNull('cable_checkouts.deleted_at');
        }

        // Combine
        $unifiedQuery = $equipmentQuery->unionAll($cableQuery);

        // Final ordering and pagination
        // Since unionAll creates a temporary table, we wrap it
        $results = DB::table(DB::raw("({$unifiedQuery->toSql()}) as unified"))
            ->mergeBindings($unifiedQuery)
            ->orderByDesc('checked_out_at')
            ->paginate($perPage);

        return response()->json($results);
    }
}
