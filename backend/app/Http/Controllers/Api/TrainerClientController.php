<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrainerClient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TrainerClientController extends Controller
{
    /**
     * Get all trainer-client relationships for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isTrainer()) {
            // For trainers, show client requests
            $relationships = $user->clientRelationships()
                ->with(['client:id,name,email,avatar_url,created_at'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        } else {
            // For clients, show trainer relationships
            $relationships = $user->trainerRelationships()
                ->with(['trainer:id,name,email,avatar_url,bio,created_at'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        }

        return response()->json([
            'success' => true,
            'data' => $relationships,
        ]);
    }

    /**
     * Request a relationship with a trainer (for clients).
     */
    public function requestTrainer(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Trainers cannot request relationships with other trainers',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'trainer_id' => 'required|string|exists:users,id',
            'request_message' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Verify trainer exists and is trainer
            $trainer = User::find($request->trainer_id);
            if (!$trainer || !$trainer->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected user is not a trainer',
                ], 422);
            }

            // Check if relationship already exists
            $existingRelationship = TrainerClient::where('trainer_id', $request->trainer_id)
                ->where('client_id', $user->id)
                ->first();

            if ($existingRelationship) {
                return response()->json([
                    'success' => false,
                    'message' => 'Relationship request already exists',
                    'data' => [
                        'current_status' => $existingRelationship->status,
                        'relationship' => $existingRelationship,
                    ],
                ], 422);
            }

            // Create new relationship request
            $relationship = TrainerClient::create([
                'trainer_id' => $request->trainer_id,
                'client_id' => $user->id,
                'request_message' => $request->request_message,
                'requested_at' => now(),
            ]);

            // Load relationships for response
            $relationship->load(['trainer:id,name,email,avatar_url,bio']);

            // TODO: Send notification to trainer

            return response()->json([
                'success' => true,
                'message' => 'Trainer relationship requested successfully',
                'data' => [
                    'relationship' => $relationship,
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to request trainer relationship',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve/reject a client request (for trainers).
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can update client relationship status',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:approved,rejected,blocked',
            'trainer_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $relationship = TrainerClient::with(['client:id,name,email,avatar_url'])
                ->find($id);

            if (!$relationship) {
                return response()->json([
                    'success' => false,
                    'message' => 'Relationship not found',
                ], 404);
            }

            if ($relationship->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only update your own client relationships',
                ], 403);
            }

            if ($relationship->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Can only update pending relationships',
                ], 422);
            }

            // Update status using model methods
            switch ($request->status) {
                case 'approved':
                    $relationship->approve($request->trainer_notes);
                    break;
                case 'rejected':
                    $relationship->reject($request->trainer_notes);
                    break;
                case 'blocked':
                    $relationship->block($request->trainer_notes);
                    break;
            }

            // TODO: Send notification to client

            return response()->json([
                'success' => true,
                'message' => 'Client relationship status updated successfully',
                'data' => [
                    'relationship' => $relationship->fresh(['client:id,name,email,avatar_url']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update relationship status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get pending client requests for trainer.
     */
    public function pendingRequests(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can view pending client requests',
            ], 403);
        }

        $pendingRequests = $user->pendingClientRequests()
            ->with(['client:id,name,email,avatar_url,created_at'])
            ->orderBy('requested_at', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $pendingRequests,
        ]);
    }

    /**
     * Get list of available trainers (public endpoint).
     */
    public function availableTrainers(Request $request): JsonResponse
    {
        $trainers = User::trainers()
            ->active()
            ->select(['id', 'name', 'email', 'bio', 'avatar_url', 'created_at'])
            ->withCount(['receivedReviews', 'clientRelationships' => function ($query) {
                $query->approved();
            }])
            ->withAvg('receivedReviews', 'rating')
            ->orderBy('name')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $trainers,
        ]);
    }

    /**
     * Remove a relationship (for both trainer and client).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        try {
            $relationship = TrainerClient::find($id);

            if (!$relationship) {
                return response()->json([
                    'success' => false,
                    'message' => 'Relationship not found',
                ], 404);
            }

            // Check if user is part of this relationship
            if ($relationship->trainer_id !== $user->id && $relationship->client_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only remove your own relationships',
                ], 403);
            }

            $relationship->delete();

            return response()->json([
                'success' => true,
                'message' => 'Relationship removed successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove relationship',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 