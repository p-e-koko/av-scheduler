<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class KeyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Key::with(['currentCheckout.user', 'assignedUser']);

        if ($request->has('assigned_user_id')) {
            $query->where('assigned_user_id', $request->assigned_user_id);
        }

        $keys = $query->get();
        
        return response()->json($keys);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|unique:key_management,code',
            'description' => 'required|string',
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $key = Key::create($request->all());

        return response()->json($key, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $key = Key::with(['currentCheckout.user', 'checkouts.user', 'assignedUser'])->findOrFail($id);
        
        return response()->json($key);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $key = Key::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|unique:key_management,code,' . $key->id . ',id',
            'description' => 'required|string',
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $key->update($request->all());

        return response()->json($key);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $key = Key::findOrFail($id);
        $key->delete();

        return response()->json(['message' => 'Key deleted successfully']);
    }

    /**
     * Get history for a specific key.
     */
    public function history($id)
    {
        $key = Key::findOrFail($id);
        $history = $key->checkouts()->with('user')->orderBy('checked_out_at', 'desc')->get();
        
        return response()->json($history);
    }
}
