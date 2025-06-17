<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class DogController extends Controller
{
    /**
     * Get all dogs for authenticated owner.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user->isOwner()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners can view dogs',
                ], 403);
            }

            $dogs = $user->dogs()
                         ->active()
                         ->orderBy('created_at', 'desc')
                         ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'dogs' => $dogs,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dogs',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new dog.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can add dogs',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'breed' => 'required|string|max:255',
            'age' => 'required|integer|min:0|max:30',
            'size' => 'nullable|string|in:small,medium,large',
            'gender' => 'nullable|string|in:male,female',
            'weight' => 'nullable|numeric|min:0|max:100',
            'photo_url' => 'nullable|string|url',
            'medical_notes' => 'nullable|string|max:2000',
            'behavioral_notes' => 'nullable|string|max:2000',
            'vaccinations' => 'nullable|array',
            'vaccinations.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $dogData = array_merge($validator->validated(), [
                'id' => Str::uuid(),
                'owner_id' => $user->id,
                'is_active' => true,
            ]);

            $dog = Dog::create($dogData);

            return response()->json([
                'success' => true,
                'message' => 'Dog added successfully',
                'data' => [
                    'dog' => $dog->load('owner'),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add dog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified dog.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            
            $dog = Dog::with(['owner', 'bookings.trainer', 'sessionSignups.session.trainer'])
                      ->find($id);

            if (!$dog) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog not found',
                ], 404);
            }

            // Check authorization
            if ($user->isOwner() && $dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only view your own dogs',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'dog' => $dog,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified dog.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            $dog = Dog::find($id);

            if (!$dog) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog not found',
                ], 404);
            }

            // Check authorization
            if (!$user->isOwner() || $dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only update your own dogs',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'breed' => 'sometimes|string|max:255',
                'age' => 'sometimes|integer|min:0|max:30',
                'size' => 'sometimes|nullable|string|in:small,medium,large',
                'gender' => 'sometimes|nullable|string|in:male,female',
                'weight' => 'sometimes|nullable|numeric|min:0|max:100',
                'photo_url' => 'sometimes|nullable|string|url',
                'medical_notes' => 'sometimes|nullable|string|max:2000',
                'behavioral_notes' => 'sometimes|nullable|string|max:2000',
                'vaccinations' => 'sometimes|nullable|array',
                'vaccinations.*' => 'string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation errors',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $dog->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Dog updated successfully',
                'data' => [
                    'dog' => $dog->fresh()->load('owner'),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update dog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified dog (soft delete).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            $dog = Dog::find($id);

            if (!$dog) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog not found',
                ], 404);
            }

            // Check authorization
            if (!$user->isOwner() || $dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only delete your own dogs',
                ], 403);
            }

            // Check if dog has active bookings or signups
            $hasActiveBookings = $dog->bookings()
                                    ->whereIn('status', ['pending', 'approved'])
                                    ->where('booking_date', '>=', now()->toDateString())
                                    ->exists();

            $hasActiveSignups = $dog->sessionSignups()
                                   ->whereIn('status', ['pending', 'approved'])
                                   ->whereHas('session', function ($query) {
                                       $query->where('start_time', '>', now());
                                   })
                                   ->exists();

            if ($hasActiveBookings || $hasActiveSignups) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete dog with active bookings or session signups',
                ], 422);
            }

            // Soft delete by setting is_active to false
            $dog->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Dog deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete dog',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get dog's upcoming bookings and sessions.
     */
    public function schedule(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            $dog = Dog::find($id);

            if (!$dog) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog not found',
                ], 404);
            }

            // Check authorization
            if ($user->isOwner() && $dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only view your own dog\'s schedule',
                ], 403);
            }

            $bookings = $dog->bookings()
                           ->with(['trainer'])
                           ->upcoming()
                           ->orderBy('booking_date')
                           ->orderBy('start_time')
                           ->get();

            $sessionSignups = $dog->sessionSignups()
                                 ->with(['session.trainer'])
                                 ->whereIn('status', ['pending', 'approved'])
                                 ->whereHas('session', function ($query) {
                                     $query->where('start_time', '>', now());
                                 })
                                 ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'dog' => $dog,
                    'bookings' => $bookings,
                    'sessions' => $sessionSignups,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dog schedule',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get dog's statistics (for trainers).
     */
    public function stats(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only trainers can view dog statistics',
                ], 403);
            }

            $dog = Dog::with(['owner'])->find($id);

            if (!$dog) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog not found',
                ], 404);
            }

            $stats = [
                'total_bookings' => $dog->bookings()->count(),
                'completed_bookings' => $dog->bookings()->completed()->count(),
                'total_sessions' => $dog->sessionSignups()->approved()->count(),
                'recent_activity' => [
                    'last_booking' => $dog->bookings()
                                         ->latest()
                                         ->with(['trainer'])
                                         ->first(),
                    'last_session' => $dog->sessionSignups()
                                         ->approved()
                                         ->with(['session.trainer'])
                                         ->whereHas('session', function ($query) {
                                             $query->where('start_time', '<', now());
                                         })
                                         ->latest()
                                         ->first(),
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'dog' => $dog,
                    'stats' => $stats,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve dog statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 