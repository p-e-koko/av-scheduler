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

        // Check if key is already checked out
        if ($key->currentCheckout()->exists()) {
            return response()->json(['message' => 'Key is already checked out'], 400);
        }

        $validator = Validator::make($request->all(), [
            'student_id' => 'required|string',
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $checkout = KeyCheckout::create([
            'key_id' => $key->id,
            'user_id' => Auth::id(),
            'student_id' => $request->student_id,
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
}
