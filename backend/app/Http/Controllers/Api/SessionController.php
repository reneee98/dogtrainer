<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Session;
use App\Models\SessionSignup;
use App\Models\SessionWaitlist;
use App\Models\Dog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SessionController extends Controller
{
    /**
     * Get sessions (filtered by user role).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Session::with(['trainer', 'signups.dog', 'waitlist.dog']);

            // Filter by user role
            if ($user->isTrainer()) {
                $query->where('trainer_id', $user->id);
            }

            // Apply filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('session_type')) {
                $query->where('session_type', $request->session_type);
            }

            if ($request->has('date')) {
                $query->onDate($request->date);
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->betweenDates($request->date_from, $request->date_to);
            }

            if ($request->has('upcoming') && $request->upcoming) {
                $query->upcoming();
            }

            $sessions = $query->orderBy('start_time')
                             ->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $sessions,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve sessions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new session (for trainers).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can create sessions',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'location' => 'required|string|max:255',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'capacity' => 'required|integer|min:1|max:50',
            'waitlist_enabled' => 'required|boolean',
            'session_type' => 'required|string|in:training,daycare,workshop',
            'price' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = Session::create([
                'id' => Str::uuid(),
                'trainer_id' => $user->id,
                'title' => $request->title,
                'description' => $request->description,
                'location' => $request->location,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'capacity' => $request->capacity,
                'waitlist_enabled' => $request->waitlist_enabled,
                'session_type' => $request->session_type,
                'price' => $request->price,
                'status' => 'scheduled',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Session created successfully',
                'data' => [
                    'session' => $session->load('trainer'),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified session.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $session = Session::with([
                'trainer',
                'signups.dog.owner',
                'waitlist.dog.owner'
            ])->find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'session' => $session,
                    'available_spots' => $session->available_spots,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified session (for trainers).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can update sessions',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string|max:2000',
            'location' => 'sometimes|string|max:255',
            'start_time' => 'sometimes|date|after:now',
            'end_time' => 'sometimes|date|after:start_time',
            'capacity' => 'sometimes|integer|min:1|max:50',
            'waitlist_enabled' => 'sometimes|boolean',
            'price' => 'sometimes|nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = Session::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            if ($session->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only update your own sessions',
                ], 403);
            }

            if ($session->status !== 'scheduled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Can only update scheduled sessions',
                ], 422);
            }

            $session->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Session updated successfully',
                'data' => [
                    'session' => $session->fresh()->load('trainer'),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete the specified session (for trainers).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can delete sessions',
            ], 403);
        }

        try {
            $session = Session::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            if ($session->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only delete your own sessions',
                ], 403);
            }

            if ($session->signups()->approved()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete session with approved signups',
                ], 422);
            }

            $session->delete();

            return response()->json([
                'success' => true,
                'message' => 'Session deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sign up a dog for a session (for owners).
     */
    public function signup(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can sign up dogs for sessions',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'dog_id' => 'required|uuid|exists:dogs,id',
            'notes' => 'nullable|string|max:1000',
            'special_requirements' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = Session::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            // Verify dog ownership
            $dog = Dog::find($request->dog_id);
            if ($dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only sign up your own dogs',
                ], 403);
            }

            if (!$session->canAcceptSignups()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session is not accepting signups',
                ], 422);
            }

            if ($session->isDogSignedUp($request->dog_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog is already signed up for this session',
                ], 422);
            }

            if ($session->isDogOnWaitlist($request->dog_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog is already on the waitlist for this session',
                ], 422);
            }

            // Check if session is full
            if ($session->isFull()) {
                if ($session->waitlist_enabled) {
                    // Add to waitlist
                    $waitlistEntry = SessionWaitlist::create([
                        'id' => Str::uuid(),
                        'session_id' => $session->id,
                        'dog_id' => $request->dog_id,
                        'notes' => $request->notes,
                        'joined_waitlist_at' => now(),
                    ]);

                    return response()->json([
                        'success' => true,
                        'message' => 'Dog added to waitlist successfully',
                        'data' => [
                            'waitlist_entry' => $waitlistEntry->load(['dog', 'session']),
                            'position' => $waitlistEntry->position,
                        ],
                    ], 201);
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Session is full and waitlist is not enabled',
                    ], 422);
                }
            }

            // Create signup
            $signup = SessionSignup::create([
                'id' => Str::uuid(),
                'session_id' => $session->id,
                'dog_id' => $request->dog_id,
                'status' => 'pending',
                'notes' => $request->notes,
                'special_requirements' => $request->special_requirements,
                'signed_up_at' => now(),
            ]);

            // TODO: Send notification to trainer

            return response()->json([
                'success' => true,
                'message' => 'Dog signed up for session successfully',
                'data' => [
                    'signup' => $signup->load(['dog', 'session']),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sign up for session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel session signup (for owners).
     */
    public function cancelSignup(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can cancel signups',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'dog_id' => 'required|uuid|exists:dogs,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = Session::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            // Verify dog ownership
            $dog = Dog::find($request->dog_id);
            if ($dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only cancel signups for your own dogs',
                ], 403);
            }

            $signup = SessionSignup::where('session_id', $id)
                                  ->where('dog_id', $request->dog_id)
                                  ->first();

            if (!$signup) {
                return response()->json([
                    'success' => false,
                    'message' => 'Signup not found',
                ], 404);
            }

            $signup->cancel();

            // TODO: Process waitlist if there was a free spot

            return response()->json([
                'success' => true,
                'message' => 'Session signup cancelled successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel signup',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add dog to session waitlist (for owners).
     */
    public function joinWaitlist(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can join waitlists',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'dog_id' => 'required|uuid|exists:dogs,id',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = Session::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            if (!$session->waitlist_enabled) {
                return response()->json([
                    'success' => false,
                    'message' => 'Waitlist is not enabled for this session',
                ], 422);
            }

            // Verify dog ownership
            $dog = Dog::find($request->dog_id);
            if ($dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only add your own dogs to waitlist',
                ], 403);
            }

            if ($session->isDogSignedUp($request->dog_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog is already signed up for this session',
                ], 422);
            }

            if ($session->isDogOnWaitlist($request->dog_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog is already on the waitlist',
                ], 422);
            }

            $waitlistEntry = SessionWaitlist::create([
                'id' => Str::uuid(),
                'session_id' => $session->id,
                'dog_id' => $request->dog_id,
                'notes' => $request->notes,
                'joined_waitlist_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Dog added to waitlist successfully',
                'data' => [
                    'waitlist_entry' => $waitlistEntry->load(['dog', 'session']),
                    'position' => $waitlistEntry->position,
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to join waitlist',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Leave session waitlist (for owners).
     */
    public function leaveWaitlist(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can leave waitlists',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'dog_id' => 'required|uuid|exists:dogs,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Verify dog ownership
            $dog = Dog::find($request->dog_id);
            if ($dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only remove your own dogs from waitlist',
                ], 403);
            }

            $waitlistEntry = SessionWaitlist::where('session_id', $id)
                                          ->where('dog_id', $request->dog_id)
                                          ->first();

            if (!$waitlistEntry) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dog is not on the waitlist',
                ], 404);
            }

            $waitlistEntry->delete();

            return response()->json([
                'success' => true,
                'message' => 'Dog removed from waitlist successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to leave waitlist',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get signups for a session (for trainers).
     */
    public function getSessionSignups(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can view session signups',
            ], 403);
        }

        try {
            $session = Session::find($id);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            if ($session->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only view signups for your own sessions',
                ], 403);
            }

            $signups = $session->signups()
                ->with(['dog.owner'])
                ->orderBy('signed_up_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'signups' => $signups,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve signups',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve a session signup (for trainers).
     */
    public function approveSignup(Request $request, string $sessionId, string $signupId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can approve signups',
            ], 403);
        }

        try {
            $session = Session::find($sessionId);
            
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            if ($session->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only approve signups for your own sessions',
                ], 403);
            }

            $signup = SessionSignup::find($signupId);
            
            if (!$signup || $signup->session_id !== $sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Signup not found',
                ], 404);
            }

            if ($signup->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Can only approve pending signups',
                ], 422);
            }

            // Check if session still has capacity
            $approvedCount = $session->signups()->approved()->count();
            if ($approvedCount >= $session->capacity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session is at full capacity',
                ], 422);
            }

            $signup->approve($user->id);

            // TODO: Send notification to owner about approval

            return response()->json([
                'success' => true,
                'message' => 'Signup approved successfully',
                'data' => [
                    'signup' => $signup->fresh()->load(['dog.owner']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve signup',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject a session signup (for trainers).
     */
    public function rejectSignup(Request $request, string $sessionId, string $signupId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can reject signups',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $session = Session::find($sessionId);
            
            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found',
                ], 404);
            }

            if ($session->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only reject signups for your own sessions',
                ], 403);
            }

            $signup = SessionSignup::find($signupId);
            
            if (!$signup || $signup->session_id !== $sessionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Signup not found',
                ], 404);
            }

            if ($signup->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Can only reject pending signups',
                ], 422);
            }

            $signup->reject($request->rejection_reason);

            // TODO: Send notification to owner about rejection

            return response()->json([
                'success' => true,
                'message' => 'Signup rejected successfully',
                'data' => [
                    'signup' => $signup->fresh()->load(['dog.owner']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject signup',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 