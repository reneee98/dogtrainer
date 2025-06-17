<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:owner,trainer',
            'phone' => 'nullable|string|max:20',
            'bio' => 'nullable|string|max:1000',
            'provider_token' => 'nullable|string', // for OAuth registration
            'provider' => 'nullable|string|in:google,facebook,apple',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $userData = [
                'id' => Str::uuid(),
                'name' => $request->name,
                'email' => $request->email,
                'role' => $request->role,
                'phone' => $request->phone,
                'bio' => $request->bio,
                'is_active' => true,
                'email_notifications' => true,
                'push_notifications' => true,
            ];

            if ($request->provider_token && $request->provider) {
                // OAuth registration
                $userData['oauth_providers'] = [$request->provider];
                $userData['email_verified_at'] = now();
            } else {
                // Regular email/password registration
                $userData['password'] = Hash::make($request->password);
            }

            $user = User::create($userData);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => [
                    'user' => $user->makeHidden(['password']),
                    'token' => $token,
                    'token_type' => 'Bearer',
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Login user and create token.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account is deactivated',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user->makeHidden(['password']),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    /**
     * OAuth login/registration.
     */
    public function oauthLogin(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'provider' => 'required|string|in:google,facebook,apple',
            'provider_token' => 'required|string',
            'email' => 'required|string|email',
            'name' => 'required|string',
            'role' => 'sometimes|string|in:owner,trainer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Check if user exists
            $user = User::where('email', $request->email)->first();

            if ($user) {
                // Update OAuth providers if not already included
                $providers = $user->oauth_providers ?? [];
                if (!in_array($request->provider, $providers)) {
                    $providers[] = $request->provider;
                    $user->update(['oauth_providers' => $providers]);
                }
            } else {
                // Create new user
                $user = User::create([
                    'id' => Str::uuid(),
                    'name' => $request->name,
                    'email' => $request->email,
                    'role' => $request->role ?? 'owner',
                    'oauth_providers' => [$request->provider],
                    'email_verified_at' => now(),
                    'is_active' => true,
                    'email_notifications' => true,
                    'push_notifications' => true,
                ]);
            }

            if (!$user->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Account is deactivated',
                ], 403);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'OAuth login successful',
                'data' => [
                    'user' => $user->makeHidden(['password']),
                    'token' => $token,
                    'token_type' => 'Bearer',
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'OAuth login failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get authenticated user details.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $request->user()->makeHidden(['password']),
            ],
        ]);
    }

    /**
     * Logout user (revoke token).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Logout from all devices (revoke all tokens).
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out from all devices successfully',
        ]);
    }

    /**
     * Update user profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'bio' => 'sometimes|nullable|string|max:1000',
            'avatar_url' => 'sometimes|nullable|string|url',
            'email_notifications' => 'sometimes|boolean',
            'push_notifications' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => [
                    'user' => $user->fresh()->makeHidden(['password']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Profile update failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Change password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 422);
        }

        try {
            $user->update([
                'password' => Hash::make($request->password),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Password change failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 