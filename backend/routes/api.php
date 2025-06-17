<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DogController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\DaycareScheduleController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\DaycareController;
use App\Http\Controllers\Api\TrainerClientController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Health Check Routes (public)
Route::get('/health', [HealthController::class, 'index']);
Route::get('/health/detailed', [HealthController::class, 'detailed']);
Route::get('/health/ready', [HealthController::class, 'ready']);
Route::get('/health/live', [HealthController::class, 'live']);
Route::get('/health/metrics', [HealthController::class, 'metrics']);

// Authentication routes (public)
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/oauth-login', [AuthController::class, 'oauthLogin']);
});

// Public routes
Route::get('/trainers/{trainer}/reviews/public', [ReviewController::class, 'publicReviews']);
Route::get('/trainers/{trainer}/stats', [ReviewController::class, 'trainerStats']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth management
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    // Dogs management (owners only)
    Route::prefix('dogs')->group(function () {
        Route::get('/', [DogController::class, 'index']);
        Route::post('/', [DogController::class, 'store']);
        Route::get('/{dog}', [DogController::class, 'show']);
        Route::put('/{dog}', [DogController::class, 'update']);
        Route::delete('/{dog}', [DogController::class, 'destroy']);
        Route::get('/{dog}/schedule', [DogController::class, 'schedule']);
        Route::get('/{dog}/stats', [DogController::class, 'stats']);
    });

    // Bookings management
    Route::prefix('bookings')->group(function () {
        Route::get('/', [BookingController::class, 'index']);
        Route::post('/', [BookingController::class, 'store']);
        Route::get('/{booking}', [BookingController::class, 'show']);
        Route::put('/{booking}/status', [BookingController::class, 'updateStatus']);
        Route::put('/{booking}/cancel', [BookingController::class, 'cancel']);
        Route::get('/available-slots', [BookingController::class, 'availableSlots']);
    });

    // Sessions management
    Route::prefix('sessions')->group(function () {
        Route::get('/', [SessionController::class, 'index']);
        Route::post('/', [SessionController::class, 'store']);
        Route::get('/{session}', [SessionController::class, 'show']);
        Route::put('/{session}', [SessionController::class, 'update']);
        Route::delete('/{session}', [SessionController::class, 'destroy']);
        
        // Session signup/waitlist
        Route::post('/{session}/signup', [SessionController::class, 'signup']);
        Route::delete('/{session}/signup', [SessionController::class, 'cancelSignup']);
        Route::post('/{session}/waitlist', [SessionController::class, 'joinWaitlist']);
        Route::delete('/{session}/waitlist', [SessionController::class, 'leaveWaitlist']);
    });

    // Daycare schedules management (trainers only)
    Route::prefix('daycare-schedules')->group(function () {
        Route::get('/', [DaycareScheduleController::class, 'index']);
        Route::post('/', [DaycareScheduleController::class, 'store']);
        Route::get('/{schedule}', [DaycareScheduleController::class, 'show']);
        Route::put('/{schedule}', [DaycareScheduleController::class, 'update']);
        Route::delete('/{schedule}', [DaycareScheduleController::class, 'destroy']);
        Route::post('/{schedule}/generate-sessions', [DaycareScheduleController::class, 'generateSessions']);
        Route::get('/{schedule}/upcoming-sessions', [DaycareScheduleController::class, 'upcomingSessions']);
        Route::put('/{schedule}/toggle-active', [DaycareScheduleController::class, 'toggleActive']);
    });

    // Reviews management
    Route::prefix('reviews')->group(function () {
        Route::get('/', [ReviewController::class, 'index']);
        Route::post('/', [ReviewController::class, 'store']);
        Route::get('/{review}', [ReviewController::class, 'show']);
        Route::put('/{review}', [ReviewController::class, 'update']);
        Route::delete('/{review}', [ReviewController::class, 'destroy']);
        Route::post('/{review}/reply', [ReviewController::class, 'reply']);
    });

    // Admin/Owner routes
    Route::prefix('owners')->middleware('role:owner')->group(function () {
        // Owner-specific endpoints can be added here
    });

    // Trainer-Client Relationship routes
    Route::prefix('trainer-clients')->group(function () {
        Route::get('/', [TrainerClientController::class, 'index']);
        Route::post('/request-trainer', [TrainerClientController::class, 'requestTrainer']);
        Route::put('/{id}/status', [TrainerClientController::class, 'updateStatus']);
        Route::get('/pending-requests', [TrainerClientController::class, 'pendingRequests']);
        Route::delete('/{id}', [TrainerClientController::class, 'destroy']);
    });

    // Trainer routes
    Route::prefix('trainers')->middleware('role:trainer')->group(function () {
        // Trainer-specific endpoints can be added here
    });
    
});

// Public Routes (no authentication required)
Route::prefix('public')->group(function () {
    Route::get('/trainers', [TrainerClientController::class, 'availableTrainers']);
    Route::get('/trainers/{trainer}', [UserController::class, 'publicTrainerProfile']);
    Route::get('/sessions/available', [SessionController::class, 'availableSessions']);
    Route::get('/reviews/trainer/{trainer}', [ReviewController::class, 'publicTrainerReviews']);
    Route::get('/statistics', [UserController::class, 'publicStatistics']);
});

// Webhook Routes
Route::prefix('webhooks')->group(function () {
    Route::post('/mailgun', [NotificationController::class, 'mailgunWebhook']);
    Route::post('/payment', [BookingController::class, 'paymentWebhook']);
});

// Fallback route for API
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found',
    ], 404);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
}); 