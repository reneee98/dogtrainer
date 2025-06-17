<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Booking;
use App\Models\Session;
use App\Models\Dog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ReviewController extends Controller
{
    /**
     * Get reviews (filtered by user role).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Review::with(['dog.owner', 'trainer', 'booking', 'session']);

            // Filter by user role
            if ($user->isOwner()) {
                $query->whereHas('dog', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            } elseif ($user->isTrainer()) {
                $query->where('trainer_id', $user->id);
            }

            // Apply filters
            if ($request->has('rating')) {
                $query->where('rating', $request->rating);
            }

            if ($request->has('min_rating')) {
                $query->minRating($request->min_rating);
            }

            if ($request->has('is_public')) {
                $query->where('is_public', $request->boolean('is_public'));
            }

            if ($request->has('with_replies')) {
                if ($request->boolean('with_replies')) {
                    $query->withReplies();
                } else {
                    $query->withoutReplies();
                }
            }

            $reviews = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $reviews,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve reviews',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new review (for owners).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can create reviews',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'dog_id' => 'required|uuid|exists:dogs,id',
            'trainer_id' => 'required|uuid|exists:users,id',
            'booking_id' => 'nullable|uuid|exists:bookings,id',
            'session_id' => 'nullable|uuid|exists:sessions,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:2000',
            'feedback_categories' => 'nullable|array',
            'feedback_categories.*' => 'string|max:255',
            'is_public' => 'required|boolean',
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
                    'message' => 'You can only review for your own dogs',
                ], 403);
            }

            // Verify trainer exists and is trainer
            $trainer = \App\Models\User::find($request->trainer_id);
            if (!$trainer || !$trainer->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid trainer',
                ], 422);
            }

            // Verify booking or session ownership if provided
            if ($request->booking_id) {
                $booking = Booking::find($request->booking_id);
                if (!$booking || $booking->dog_id !== $request->dog_id || $booking->trainer_id !== $request->trainer_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid booking for this dog and trainer',
                    ], 422);
                }
            }

            if ($request->session_id) {
                $session = Session::find($request->session_id);
                if (!$session || $session->trainer_id !== $request->trainer_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid session for this trainer',
                    ], 422);
                }

                // Check if dog was signed up for this session
                $wasSignedUp = $session->signups()
                                     ->where('dog_id', $request->dog_id)
                                     ->where('status', 'approved')
                                     ->exists();

                if (!$wasSignedUp) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Dog was not approved for this session',
                    ], 422);
                }
            }

            // Check if review already exists
            $existingReview = Review::where('dog_id', $request->dog_id)
                                  ->where('trainer_id', $request->trainer_id)
                                  ->when($request->booking_id, function ($query, $bookingId) {
                                      return $query->where('booking_id', $bookingId);
                                  })
                                  ->when($request->session_id, function ($query, $sessionId) {
                                      return $query->where('session_id', $sessionId);
                                  })
                                  ->first();

            if ($existingReview) {
                return response()->json([
                    'success' => false,
                    'message' => 'Review already exists for this service',
                ], 422);
            }

            $review = Review::create([
                'id' => Str::uuid(),
                'dog_id' => $request->dog_id,
                'trainer_id' => $request->trainer_id,
                'booking_id' => $request->booking_id,
                'session_id' => $request->session_id,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'feedback_categories' => $request->feedback_categories,
                'is_public' => $request->is_public,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Review created successfully',
                'data' => [
                    'review' => $review->load(['dog.owner', 'trainer', 'booking', 'session']),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified review.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            $review = Review::with(['dog.owner', 'trainer', 'booking', 'session', 'replier'])->find($id);

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Review not found',
                ], 404);
            }

            // Check authorization
            $canView = false;
            if ($review->is_public) {
                $canView = true;
            } elseif ($user->isOwner() && $review->dog->owner_id === $user->id) {
                $canView = true;
            } elseif ($user->isTrainer() && $review->trainer_id === $user->id) {
                $canView = true;
            }

            if (!$canView) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not authorized to view this review',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'review' => $review,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified review (for owners).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can update reviews',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'rating' => 'sometimes|integer|min:1|max:5',
            'comment' => 'sometimes|string|max:2000',
            'feedback_categories' => 'sometimes|nullable|array',
            'feedback_categories.*' => 'string|max:255',
            'is_public' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $review = Review::with(['dog.owner'])->find($id);

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Review not found',
                ], 404);
            }

            if ($review->dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only update your own reviews',
                ], 403);
            }

            $review->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Review updated successfully',
                'data' => [
                    'review' => $review->fresh()->load(['dog.owner', 'trainer', 'booking', 'session']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete the specified review (for owners).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can delete reviews',
            ], 403);
        }

        try {
            $review = Review::with(['dog.owner'])->find($id);

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Review not found',
                ], 404);
            }

            if ($review->dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only delete your own reviews',
                ], 403);
            }

            $review->delete();

            return response()->json([
                'success' => true,
                'message' => 'Review deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete review',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add reply to review (for trainers).
     */
    public function reply(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can reply to reviews',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reply' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $review = Review::find($id);

            if (!$review) {
                return response()->json([
                    'success' => false,
                    'message' => 'Review not found',
                ], 404);
            }

            if ($review->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only reply to reviews about you',
                ], 403);
            }

            if ($review->hasReply()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Review already has a reply',
                ], 422);
            }

            $review->addReply($request->reply, $user->id);

            return response()->json([
                'success' => true,
                'message' => 'Reply added successfully',
                'data' => [
                    'review' => $review->fresh()->load(['dog.owner', 'trainer', 'replier']),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add reply',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get trainer's review statistics.
     */
    public function trainerStats(Request $request, string $trainerId): JsonResponse
    {
        try {
            $trainer = \App\Models\User::find($trainerId);

            if (!$trainer || !$trainer->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trainer not found',
                ], 404);
            }

            $stats = [
                'average_rating' => Review::averageRatingForTrainer($trainerId),
                'total_reviews' => Review::countForTrainer($trainerId),
                'rating_distribution' => Review::ratingDistributionForTrainer($trainerId),
                'recent_reviews' => Review::where('trainer_id', $trainerId)
                                        ->where('is_public', true)
                                        ->with(['dog.owner'])
                                        ->orderBy('created_at', 'desc')
                                        ->limit(5)
                                        ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'trainer' => $trainer->only(['id', 'name', 'bio']),
                    'stats' => $stats,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve trainer statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get public reviews for a trainer.
     */
    public function publicReviews(Request $request, string $trainerId): JsonResponse
    {
        try {
            $trainer = \App\Models\User::find($trainerId);

            if (!$trainer || !$trainer->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trainer not found',
                ], 404);
            }

            $query = Review::where('trainer_id', $trainerId)
                          ->where('is_public', true)
                          ->with(['dog.owner', 'booking', 'session', 'replier']);

            // Apply filters
            if ($request->has('rating')) {
                $query->where('rating', $request->rating);
            }

            if ($request->has('min_rating')) {
                $query->minRating($request->min_rating);
            }

            $reviews = $query->orderBy('created_at', 'desc')->paginate(10);

            return response()->json([
                'success' => true,
                'data' => [
                    'trainer' => $trainer->only(['id', 'name', 'bio']),
                    'reviews' => $reviews,
                    'average_rating' => Review::averageRatingForTrainer($trainerId),
                    'total_reviews' => Review::countForTrainer($trainerId),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve public reviews',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 