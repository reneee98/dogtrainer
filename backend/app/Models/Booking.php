<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'dog_id',
        'trainer_id',
        'service_type',
        'booking_date',
        'start_time',
        'end_time',
        'status',
        'notes',
        'special_requirements',
        'price',
        'cancellation_reason',
        'cancelled_at',
        'cancelled_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'booking_date' => 'date',
        'start_time' => 'datetime:H:i:s',
        'end_time' => 'datetime:H:i:s',
        'price' => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Get the dog for this booking.
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Get the trainer for this booking.
     */
    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    /**
     * Get the user who cancelled this booking.
     */
    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /**
     * Get the reviews for this booking.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Scope to get pending bookings.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get approved bookings.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope to get rejected bookings.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope to get cancelled bookings.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope to get completed bookings.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope to get upcoming bookings.
     */
    public function scopeUpcoming($query)
    {
        return $query->where('booking_date', '>=', now()->toDateString())
                    ->whereIn('status', ['approved', 'pending']);
    }

    /**
     * Scope to filter by service type.
     */
    public function scopeServiceType($query, string $serviceType)
    {
        return $query->where('service_type', $serviceType);
    }

    /**
     * Scope to get bookings on a specific date.
     */
    public function scopeOnDate($query, string $date)
    {
        return $query->where('booking_date', $date);
    }

    /**
     * Scope to get bookings in a date range.
     */
    public function scopeBetweenDates($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('booking_date', [$startDate, $endDate]);
    }

    /**
     * Approve this booking.
     */
    public function approve(): bool
    {
        $this->update(['status' => 'approved']);
        return true;
    }

    /**
     * Reject this booking.
     */
    public function reject(): bool
    {
        $this->update(['status' => 'rejected']);
        return true;
    }

    /**
     * Cancel this booking.
     */
    public function cancel(string $reason = null, string $cancelledBy = null): bool
    {
        $this->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
            'cancelled_at' => now(),
            'cancelled_by' => $cancelledBy,
        ]);
        
        return true;
    }

    /**
     * Complete this booking.
     */
    public function complete(): bool
    {
        $this->update(['status' => 'completed']);
        return true;
    }

    /**
     * Check if booking can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'approved']) && 
               $this->booking_date >= now()->toDateString();
    }

    /**
     * Check if booking can be rescheduled.
     */
    public function canBeRescheduled(): bool
    {
        return in_array($this->status, ['pending', 'approved']) && 
               $this->booking_date >= now()->toDateString();
    }

    /**
     * Get status color for UI.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'approved' => 'green',
            'rejected' => 'red',
            'cancelled' => 'gray',
            'completed' => 'blue',
            default => 'gray',
        };
    }

    /**
     * Get status text in Slovak.
     */
    public function getStatusTextAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Čaká na schválenie',
            'approved' => 'Schválené',
            'rejected' => 'Odmietnuté',
            'cancelled' => 'Zrušené',
            'completed' => 'Dokončené',
            default => 'Neznámy',
        };
    }

    /**
     * Get service type text in Slovak.
     */
    public function getServiceTypeTextAttribute(): string
    {
        return match($this->service_type) {
            'obedience' => 'Poslušnosť',
            'daycare' => 'Psia škôlka',
            'grooming' => 'Starostlivosť',
            'training' => 'Tréning',
            default => $this->service_type,
        };
    }

    /**
     * Get formatted time range.
     */
    public function getTimeRangeAttribute(): string
    {
        return $this->start_time->format('H:i') . ' - ' . $this->end_time->format('H:i');
    }

    /**
     * Get booking duration in minutes.
     */
    public function getDurationAttribute(): int
    {
        return $this->start_time->diffInMinutes($this->end_time);
    }
} 