<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DaycareSchedule;
use App\Models\Session;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DaycareScheduleController extends Controller
{
    /**
     * Get daycare schedules (filtered by user role).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = DaycareSchedule::with(['trainer']);

            // Filter by user role
            if ($user->isTrainer()) {
                $query->where('trainer_id', $user->id);
            }

            // Apply filters
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            if ($request->has('day_of_week')) {
                $query->forDayOfWeek($request->day_of_week);
            }

            $schedules = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $schedules,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve daycare schedules',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a new daycare schedule (for trainers).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can create daycare schedules',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'location' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1|max:50',
            'waitlist_enabled' => 'required|boolean',
            'days_of_week' => 'required|array|min:1',
            'days_of_week.*' => 'integer|min:1|max:7',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'price' => 'nullable|numeric|min:0',
            'valid_from' => 'required|date|after_or_equal:today',
            'valid_until' => 'nullable|date|after:valid_from',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $schedule = DaycareSchedule::create([
                'id' => Str::uuid(),
                'trainer_id' => $user->id,
                'title' => $request->title,
                'description' => $request->description,
                'location' => $request->location,
                'capacity' => $request->capacity,
                'waitlist_enabled' => $request->waitlist_enabled,
                'days_of_week' => array_unique($request->days_of_week),
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'price' => $request->price,
                'is_active' => true,
                'valid_from' => $request->valid_from,
                'valid_until' => $request->valid_until,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Daycare schedule created successfully',
                'data' => [
                    'schedule' => $schedule->load('trainer'),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create daycare schedule',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified daycare schedule.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $schedule = DaycareSchedule::with(['trainer', 'sessions'])->find($id);

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daycare schedule not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'schedule' => $schedule,
                    'formatted_days' => $schedule->formatted_days,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve daycare schedule',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified daycare schedule (for trainers).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can update daycare schedules',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string|max:2000',
            'location' => 'sometimes|string|max:255',
            'capacity' => 'sometimes|integer|min:1|max:50',
            'waitlist_enabled' => 'sometimes|boolean',
            'days_of_week' => 'sometimes|array|min:1',
            'days_of_week.*' => 'integer|min:1|max:7',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'price' => 'sometimes|nullable|numeric|min:0',
            'valid_until' => 'sometimes|nullable|date|after:valid_from',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $schedule = DaycareSchedule::find($id);

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daycare schedule not found',
                ], 404);
            }

            if ($schedule->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only update your own schedules',
                ], 403);
            }

            $updateData = $validator->validated();

            // Ensure unique days of week
            if (isset($updateData['days_of_week'])) {
                $updateData['days_of_week'] = array_unique($updateData['days_of_week']);
            }

            $schedule->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Daycare schedule updated successfully',
                'data' => [
                    'schedule' => $schedule->fresh()->load('trainer'),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update daycare schedule',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete the specified daycare schedule (for trainers).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can delete daycare schedules',
            ], 403);
        }

        try {
            $schedule = DaycareSchedule::find($id);

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daycare schedule not found',
                ], 404);
            }

            if ($schedule->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only delete your own schedules',
                ], 403);
            }

            // Check if schedule has future sessions with signups
            $hasFutureSessions = $schedule->sessions()
                                        ->where('start_time', '>', now())
                                        ->whereHas('signups', function ($query) {
                                            $query->whereIn('status', ['pending', 'approved']);
                                        })
                                        ->exists();

            if ($hasFutureSessions) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete schedule with future sessions that have signups',
                ], 422);
            }

            $schedule->delete();

            return response()->json([
                'success' => true,
                'message' => 'Daycare schedule deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete daycare schedule',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate sessions from daycare schedule.
     */
    public function generateSessions(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can generate sessions',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $schedule = DaycareSchedule::find($id);

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daycare schedule not found',
                ], 404);
            }

            if ($schedule->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only generate sessions from your own schedules',
                ], 403);
            }

            if (!$schedule->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot generate sessions from inactive schedule',
                ], 422);
            }

            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            // Generate session data
            $sessionData = $schedule->generateSessionsForDateRange($startDate, $endDate);

            if (empty($sessionData)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No sessions to generate for the specified date range',
                ], 422);
            }

            // Create sessions
            $createdSessions = [];
            foreach ($sessionData as $data) {
                // Check if session already exists for this date and time
                $existingSession = Session::where('trainer_id', $data['trainer_id'])
                                         ->where('schedule_id', $data['schedule_id'])
                                         ->whereDate('start_time', $data['start_time']->toDateString())
                                         ->whereTime('start_time', $data['start_time']->toTimeString())
                                         ->first();

                if (!$existingSession) {
                    $data['id'] = Str::uuid();
                    $session = Session::create($data);
                    $createdSessions[] = $session;
                }
            }

            return response()->json([
                'success' => true,
                'message' => count($createdSessions) . ' sessions generated successfully',
                'data' => [
                    'generated_sessions' => $createdSessions,
                    'total_generated' => count($createdSessions),
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate sessions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get upcoming sessions from this schedule.
     */
    public function upcomingSessions(Request $request, string $id): JsonResponse
    {
        try {
            $schedule = DaycareSchedule::find($id);

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daycare schedule not found',
                ], 404);
            }

            $sessions = $schedule->sessions()
                                ->with(['signups.dog', 'waitlist.dog'])
                                ->where('start_time', '>', now())
                                ->where('status', 'scheduled')
                                ->orderBy('start_time')
                                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'schedule' => $schedule,
                    'upcoming_sessions' => $sessions,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve upcoming sessions',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Toggle schedule active status.
     */
    public function toggleActive(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isTrainer()) {
            return response()->json([
                'success' => false,
                'message' => 'Only trainers can toggle schedule status',
            ], 403);
        }

        try {
            $schedule = DaycareSchedule::find($id);

            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Daycare schedule not found',
                ], 404);
            }

            if ($schedule->trainer_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only toggle your own schedules',
                ], 403);
            }

            $schedule->update(['is_active' => !$schedule->is_active]);

            return response()->json([
                'success' => true,
                'message' => 'Schedule status updated successfully',
                'data' => [
                    'schedule' => $schedule->fresh(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to toggle schedule status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
} 