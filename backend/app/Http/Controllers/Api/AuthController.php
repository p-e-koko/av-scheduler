<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;
use App\Helpers\AuditLogger;
use Illuminate\Auth\Events\Registered;

use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request) {
                $userData = [
                    'student_id' => $request->student_id,
                    'username' => $request->username,
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => $request->password,
                    'role' => $request->role ?? 'student',
                    'promised_hours_per_week' => $request->promised_hours_per_week,
                    'remaining_hours_this_week' => $request->promised_hours_per_week ?? 0,
                ];

                // Handle profile picture upload
                if ($request->hasFile('profile_picture')) {
                    $profilePicture = $request->file('profile_picture');
                    $fileName = time() . '_' . uniqid() . '.' . $profilePicture->getClientOriginalExtension();
                    $path = $profilePicture->storeAs('profile_pictures', $fileName, 'public');
                    $userData['profile_picture'] = $path;
                }

                $user = User::create($userData);

                // Assign Spatie role to ensure permissions work
                // Check if role exists first to avoid crashing
                if (Role::where('name', $userData['role'])->exists()) {
                    $user->assignRole($userData['role']);
                } else {
                    AuditLogger::log('Role Assignment Failed', ['email' => $user->email, 'role' => $userData['role'], 'reason' => 'Role does not exist']);
                    // Optionally create the role or just log it.
                    // For now, we continue without assigning the Spatie role, but the 'role' column is set.
                }

                // Email verification is required, so we do not auto-verify here

                try {
                    event(new Registered($user));
                } catch (\Exception $e) {
                    // Log mail error but don't fail registration
                    AuditLogger::log('Registration Email Failed', ['email' => $user->email, 'error' => $e->getMessage()]);
                }

                AuditLogger::log('User Registered', ['email' => $user->email, 'role' => $user->role]);

                return response()->json([
                    'message' => 'User registered successfully.',
                    'user' => new UserResource($user),
                ], 201);
            });
        } catch (\Exception $e) {
            AuditLogger::log('Registration Failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Registration failed. Please try again.',
                'error' => $e->getMessage() // Only for debugging, maybe remove in strict production
            ], 500);
        }
    }

    /**
     * Login user and create session.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only(['email', 'password']);

        // Find user by email, username, or student_id
        $user = User::where('email', $request->email)
            ->orWhere('username', $request->email)
            ->orWhere('student_id', $request->email)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AuditLogger::log('Failed Login Attempt', ['email' => $request->email, 'ip' => $request->ip()]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if email is verified
        if (!$user->hasVerifiedEmail()) {
            AuditLogger::log('Unverified Login Attempt', ['email' => $user->email]);
            return response()->json([
                'message' => 'Your email address is not verified. Please check your email for the verification link.',
                'email_verified' => false
            ], 403);
        }

        // Login the user with session
        Auth::login($user);
        $request->session()->regenerate();

        AuditLogger::log('User Logged In', ['email' => $user->email]);

        return response()->json([
            'message' => 'Login successful',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Logout user (destroy session).
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
             AuditLogger::log('User Logged Out', ['email' => $user->email]);
        }

        // For Sanctum API authentication, delete the current access token
        if ($request->user() && $request->user()->currentAccessToken()) {
            $accessToken = $request->user()->currentAccessToken();
            if (!($accessToken instanceof \Laravel\Sanctum\TransientToken)) {
                $accessToken->delete();
            }
        }

        // Also handle session-based logout if present
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        if (!Auth::check()) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        return response()->json([
            'user' => new UserResource(Auth::user())
        ]);
    }

    /**
     * Refresh session.
     */
    public function refresh(Request $request): JsonResponse
    {
        if (!Auth::check()) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        // Regenerate session ID for security
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Session refreshed successfully',
            'user' => new UserResource(Auth::user())
        ]);
    }

    /**
     * Send password reset email.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        $user = User::where('email', $request->email)->first();

        // Generate reset token
        $token = \Illuminate\Support\Str::random(64);

        // Store token in password_reset_tokens table
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token' => Hash::make($token),
                'created_at' => now()
            ]
        );

        // In production, you would send this via email
        // For now, we'll return it in the response for testing
        return response()->json([
            'message' => 'Password reset token generated successfully',
            'reset_token' => $token, // Remove this in production
            'instructions' => 'Use this token with POST /api/auth/reset-password'
        ]);
    }

    /**
     * Reset password using token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed'
        ]);

        // Check if token exists and is valid
        $resetRecord = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$resetRecord || !Hash::check($request->token, $resetRecord->token)) {
            throw ValidationException::withMessages([
                'token' => ['Invalid or expired reset token.'],
            ]);
        }

        // Check if token is not older than 1 hour
        if (now()->diffInMinutes($resetRecord->created_at) > 60) {
            throw ValidationException::withMessages([
                'token' => ['Reset token has expired.'],
            ]);
        }

        // Update user password
        $user = User::where('email', $request->email)->first();
        $user->update([
            'password' => $request->password
        ]);

        // Delete the reset token
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        return response()->json([
            'message' => 'Password reset successfully'
        ]);
    }

    /**
     * Verify user email.
     */
    public function verifyEmail(Request $request)
    {
        $user = User::find($request->route('id'));

        if (!$user) {
             return redirect(config('app.frontend_url') . '/login?error=invalid_user');
        }

        if (! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
             return redirect(config('app.frontend_url') . '/login?error=invalid_hash');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect(config('app.frontend_url') . '/dashboard?verified=1');
        }

        if ($user->markEmailAsVerified()) {
            event(new \Illuminate\Auth\Events\Verified($user));
        }

        return redirect(config('app.frontend_url') . '/dashboard?verified=1');
    }

    /**
     * Resend verification email.
     */
    public function resendVerificationEmail(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Return success to prevent email enumeration
            return response()->json(['message' => 'If an account with that email exists, a verification link has been sent.']);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent.']);
    }

    public function redirectToProvider(Request $request)
    {
        $provider = $request->route('provider', 'microsoft');
        return \Laravel\Socialite\Facades\Socialite::driver($provider)->redirect();
    }

    public function handleProviderCallback(Request $request)
    {
        $provider = $request->route('provider', 'microsoft');
        
        try {
            // Use stateless() to bypass session state checking which often fails in API/Proxy setups
            $socialUser = \Laravel\Socialite\Facades\Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Socialite Login Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            $errorMessage = $e->getMessage() ?: class_basename($e);
            return redirect(config('app.frontend_url') . '/login?error=Unable to login with ' . $provider . ': ' . $errorMessage);
        }

        $user = User::withTrashed()->where('email', $socialUser->getEmail())->first();

        if ($user) {
            if ($user->trashed()) {
                 $user->restore();
            }
            
            $user->update([
                'provider' => $provider,
                'provider_id' => $socialUser->getId(),
                'avatar' => $socialUser->getAvatar(),
                'email_verified_at' => $user->email_verified_at ?? now(), // Auto verify email
            ]);
        } else {
            $user = User::create([
                'name' => $socialUser->getName(),
                'email' => $socialUser->getEmail(),
                'provider' => $provider,
                'provider_id' => $socialUser->getId(),
                'avatar' => $socialUser->getAvatar(),
                'password' => null, 
                'role' => 'student',
                'email_verified_at' => now(),
            ]);
        }

        Auth::login($user, true);

        return redirect(config('app.frontend_url') . '/dashboard');
    }
}
