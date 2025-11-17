<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        $user = $request->user();

        // Check if user has any of the required roles (using enum role field)
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Forbidden. Required roles: ' . implode(', ', $roles),
                'user_role' => $user->role
            ], 403);
        }

        return $next($request);
    }
}
