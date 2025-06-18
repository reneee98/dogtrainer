<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Session extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'trainer_id',
        'schedule_id',
        'title',
        'description',
        'location',
        'start_time',
        'end_time',
        'capacity',
        'minimum_participants',
        'waitlist_enabled',
        'session_type',
        'price',
        'status',
        'cancellation_reason',
        'cancelled_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'capacity' => 'integer',
        'minimum_participants' => 'integer',
        'waitlist_enabled' => 'boolean',
        'price' => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Get the trainer who created this session.
     */
    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    /**
     * Get the daycare schedule this session was generated from.
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(DaycareSchedule::class, 'schedule_id');
    }

    /**
     * Get the signups for this session.
     */
    public function signups(): HasMany
    {
        return $this->hasMany(SessionSignup::class);
    }

    /**
     * Get the approved signups for this session.
     */
    public function approvedSignups(): HasMany
    {
        return $this->hasMany(SessionSignup::class)->where('status', 'approved');
    }

    /**
     * Get the pending signups for this session.
     */
    public function pendingSignups(): HasMany
    {
        return $this->hasMany(SessionSignup::class)->where('status', 'pending');
    }

    /**
     * Get the waitlist entries for this session.
     */
    public function waitlist(): HasMany
    {
        return $this->hasMany(SessionWaitlist::class);
    }

    /**
     * Get the reviews for this session.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Scope to get upcoming sessions.
     */
    public function scopeUpcoming($query)
    {
        return $query->where('start_time', '>', now())
                    ->where('status', 'scheduled');
    }

    /**
     * Scope to get sessions by type.
     */
    public function scopeType($query, string $type)
    {
        return $query->where('session_type', $type);
    }

    /**
     * Scope to get sessions on a specific date.
     */
    public function scopeOnDate($query, string $date)
    {
        return $query->whereDate('start_time', $date);
    }

    /**
     * Scope to get sessions in a date range.
     */
    public function scopeBetweenDates($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('start_time', [$startDate, $endDate]);
    }

    /**
     * Get the number of available spots.
     */
    public function getAvailableSpotsAttribute(): int
    {
        return max(0, $this->capacity - $this->approvedSignups()->count());
    }

    /**
     * Check if session is full.
     */
    public function isFull(): bool
    {
        return $this->available_spots <= 0;
    }

    /**
     * Check if session can accept signups.
     */
    public function canAcceptSignups(): bool
    {
        return $this->status === 'scheduled' && 
               $this->start_time > now() && 
               (!$this->isFull() || $this->waitlist_enabled);
    }

    /**
     * Check if session has minimum participants to start.
     */
    public function hasMinimumParticipants(): bool
    {
        return $this->approvedSignups()->count() >= $this->minimum_participants;
    }

    /**
     * Check if session can be started.
     */
    public function canBeStarted(): bool
    {
        return $this->status === 'scheduled' && 
               $this->hasMinimumParticipants() &&
               $this->start_time <= now();
    }

    /**
     * Check if dog is already signed up.
     */
    public function isDogSignedUp(string $dogId): bool
    {
        return $this->signups()->where('dog_id', $dogId)->exists();
    }

    /**
     * Check if dog is on waitlist.
     */
    public function isDogOnWaitlist(string $dogId): bool
    {
        return $this->waitlist()->where('dog_id', $dogId)->exists();
    }

    /**
     * Get session duration in minutes.
     */
    public function getDurationAttribute(): int
    {
        return $this->start_time->diffInMinutes($this->end_time);
    }

    /**
     * Get formatted time range.
     */
    public function getTimeRangeAttribute(): string
    {
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    /**
     * Get formatted date.
     */
    public function getDateAttribute(): string
    {
        return $this->start_time->format('d.m.Y');
    }

    /**
     * Get status color for UI.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'scheduled' => 'green',
            'in_progress' => 'blue',
            'completed' => 'gray',
            'cancelled' => 'red',
            default => 'gray',
        };
    }
} 