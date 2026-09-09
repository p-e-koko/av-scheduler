<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Key;
use App\Models\KeyCheckout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class KeyCheckoutController extends Controller
{
    /**
     * Checkout a key.
     */
    public function checkout(Request $request, $id)
    {
        $key = Key::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();
        $studentId = $user->student_id ?? $user->username ?? 'Unknown';

        // Check if key is already checked out by someone else
        $currentCheckout = $key->currentCheckout;
        if ($currentCheckout) {
            // Automatic handover: mark previous checkout as returned
            $currentCheckout->update([
                'returned_at' => now(),
            ]);
        }

        $checkout = KeyCheckout::create([
            'key_id' => $key->id,
            'user_id' => $user->id,
            'student_id' => $studentId,
            'purpose' => $request->purpose,
            'checked_out_at' => now(),
        ]);

        return response()->json($checkout, 201);
    }

    /**
     * Return a key.
     */
    public function return(Request $request, $id)
    {
        $key = Key::findOrFail($id);
        $checkout = $key->currentCheckout;

        if (!$checkout) {
            return response()->json(['message' => 'Key is not currently checked out'], 400);
        }

        $checkout->update([
            'returned_at' => now(),
        ]);

        return response()->json(['message' => 'Key returned successfully', 'checkout' => $checkout]);
    }

    /**
     * Take multiple keys at once ("Take All" / Multi-take).
     */
    public function bulkTake(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'key_ids' => 'required|array|min:1',
            'key_ids.*' => 'required|exists:key_management,id',
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();
        $studentId = $user->student_id ?? $user->username ?? 'Unknown';
        $checkouts = [];

        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            foreach ($request->key_ids as $keyId) {
                $key = Key::findOrFail($keyId);
                $currentCheckout = $key->currentCheckout;
                if ($currentCheckout) {
                    $currentCheckout->update(['returned_at' => now()]);
                }

                $checkout = KeyCheckout::create([
                    'key_id' => $key->id,
                    'user_id' => $user->id,
                    'student_id' => $studentId,
                    'purpose' => $request->purpose,
                    'checked_out_at' => now(),
                ]);

                $checkouts[] = $checkout->load('key', 'user');
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => count($checkouts) . ' key(s) taken successfully.',
                'checkouts' => $checkouts,
            ], 201);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json(['message' => 'Bulk key take failed: ' . $e->getMessage()], 500);
        }
    }
}
