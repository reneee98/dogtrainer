<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Dog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class BookingController extends Controller
{
    /**
     * Get bookings (filtered by user role).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Booking::with(['dog.owner', 'trainer']);

            // Filter by user role
            if ($user->isOwner()) {
                $query->whereHas('dog', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            } elseif ($user->isTrainer()) {
                $query->where('trainer_id', $user->id);
            }

            // Apply filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('service_type')) {
                $query->where('service_type', $request->service_type);
            }

            if ($request->has('date')) {
                $query->onDate($request->date);
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->betweenDates($request->date_from, $request->date_to);
            }

            $bookings = $query->orderBy('booking_date', 'desc')
                             ->orderBy('start_time', 'desc')
                             ->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $bookings,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve bookings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new booking.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Only owners can create bookings',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'dog_id' => 'required|uuid|exists:dogs,id',
            'trainer_id' => 'required|uuid|exists:users,id',
            'service_type' => 'required|string|in:obedience,daycare,grooming,training',
            'booking_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
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
            // Verify dog ownership
            $dog = Dog::find($request->dog_id);
            if ($dog->owner_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only book for your own dogs',
                ], 403);
            }

            // Verify trainer role
            $trainer = User::find($request->trainer_id);
            if (!$trainer->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected user is not a trainer',
                ], 422);
            }

            // Check for conflicts
            $conflictingBooking = Booking::where('trainer_id', $request->trainer_id)
                                        ->where('booking_date', $request->booking_date)
                                        ->where('status', '!=', 'cancelled')
                                        ->where(function ($query) use ($request) {
                                            $query->whereBetween('start_time', [$request->start_time, $request->end_time])
                                                  ->orWhereBetween('end_time', [$request->start_time, $request->end_time])
                                                  ->orWhere(function ($q) use ($request) {
                                                      $q->where('start_time', '<=', $request->start_time)
                                                        ->where('end_time', '>=', $request->end_time);
                                                  });
                                        })
                                        ->exists();

            if ($conflictingBooking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trainer is not available at the requested time',
                ], 422);
            }

            $booking = Booking::create([
                'id' => Str::uuid(),
                'dog_id' => $request->dog_id,
                'trainer_id' => $request->trainer_id,
                'service_type' => $request->service_type,
                'booking_date' => $request->booking_date,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'status' => 'pending',
                'notes' => $request->notes,
                'special_requirements' => $request->special_requirements,
            ]);

            // TODO: Send notification to trainer

            return response()->json([
                'success' => true,
                'message' => 'Booking created successfully',
                'data' => [
                    'booking' => $booking->load(['dog.owner', 'trainer']),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified booking.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            $booking = Booking::with(['dog.owner', 'trainer', 'reviews'])->find($id);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found',
                ], 404);
            }

            // Check authorization
            $canView = false;
            if ($user->isOwner() && $booking->dog->owner_id === $user->id) {
                $canView = true;
            } elseif ($user->isTrainer() && $booking->trainer_id === $user->id) {
                $canView = true;
            }

            if (!$canView) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not authorized to view this booking',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => $booking,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update booking status (for trainers).
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can update booking status',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:approved,rejected',
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
            $booking = Booking::with(['dog.owner', 'trainer'])->find($id);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found',
                ], 404);
            }

            if ($booking->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only update your own bookings',
                ], 403);
            }

            if ($booking->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Can only update pending bookings',
                ], 422);
            }

            $booking->update([
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            // TODO: Send notification to owner

            return response()->json([
                'success' => true,
                'message' => 'Booking status updated successfully',
                'data' => [
                    'booking' => $booking->fresh(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel a booking.
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $booking = Booking::with(['dog.owner', 'trainer'])->find($id);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found',
                ], 404);
            }

            // Check authorization
            $canCancel = false;
            if ($user->isOwner() && $booking->dog->owner_id === $user->id) {
                $canCancel = true;
            } elseif ($user->isTrainer() && $booking->trainer_id === $user->id) {
                $canCancel = true;
            }

            if (!$canCancel) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not authorized to cancel this booking',
                ], 403);
            }

            if (!$booking->canBeCancelled()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking cannot be cancelled',
                ], 422);
            }

            $booking->cancel($request->reason, $user->id);

            // TODO: Send notification to other party

            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled successfully',
                'data' => [
                    'booking' => $booking->fresh(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available time slots for a trainer on a specific date.
     */
    public function availableSlots(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'trainer_id' => 'required|uuid|exists:users,id',
            'date' => 'required|date|after_or_equal:today',
            'service_type' => 'required|string|in:obedience,daycare,grooming,training',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $trainer = User::find($request->trainer_id);
            if (!$trainer->isTrainer()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected user is not a trainer',
                ], 422);
                }

            // Get existing bookings for the date
            $existingBookings = Booking::where('trainer_id', $request->trainer_id)
                                     ->where('booking_date', $request->date)
                                     ->whereIn('status', ['pending', 'approved'])
                                     ->orderBy('start_time')
                                     ->get(['start_time', 'end_time']);

            // Define working hours (can be made configurable per trainer)
            $workingHours = [
                'start' => '08:00',
                'end' => '18:00',
                'slot_duration' => 60, // minutes
            ];

            // Generate available slots
            $availableSlots = [];
            $currentTime = Carbon::createFromFormat('H:i', $workingHours['start']);
            $endTime = Carbon::createFromFormat('H:i', $workingHours['end']);

            while ($currentTime->lt($endTime)) {
                $slotEnd = $currentTime->copy()->addMinutes($workingHours['slot_duration']);
                
                // Check if slot conflicts with existing bookings
                $hasConflict = $existingBookings->contains(function ($booking) use ($currentTime, $slotEnd) {
                    $bookingStart = Carbon::createFromFormat('H:i:s', $booking->start_time);
                    $bookingEnd = Carbon::createFromFormat('H:i:s', $booking->end_time);
                    
                    return $currentTime->lt($bookingEnd) && $slotEnd->gt($bookingStart);
                });

                if (!$hasConflict) {
                    $availableSlots[] = [
                        'start_time' => $currentTime->format('H:i'),
                        'end_time' => $slotEnd->format('H:i'),
                    ];
                }

                $currentTime->addMinutes($workingHours['slot_duration']);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $request->date,
                    'trainer' => $trainer->only(['id', 'name']),
                    'slots' => $availableSlots,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve available slots',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 