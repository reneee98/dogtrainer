<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionSignup extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'session_id',
        'dog_id',
        'status',
        'notes',
        'special_requirements',
        'signed_up_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'signed_up_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the session this signup belongs to.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class);
    }

    /**
     * Get the dog that signed up.
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Get the trainer who approved this signup.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope to get pending signups.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get approved signups.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope to get rejected signups.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope to get cancelled signups.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Approve this signup.
     */
    public function approve(string $approverId): bool
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
        ]);

        return true;
    }

    /**
     * Reject this signup.
     */
    public function reject(string $reason = null): bool
    {
        $this->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
        ]);

        return true;
    }

    /**
     * Cancel this signup.
     */
    public function cancel(): bool
    {
        $this->update([
            'status' => 'cancelled',
        ]);

        return true;
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
            default => 'Neznámy',
        };
    }
} 