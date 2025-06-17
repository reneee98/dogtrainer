<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainerClient extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'trainer_id',
        'client_id',
        'status',
        'request_message',
        'trainer_notes',
        'requested_at',
        'responded_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'requested_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    /**
     * Get the trainer in this relationship.
     */
    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    /**
     * Get the client in this relationship.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /**
     * Scope to get pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get approved relationships.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope to get rejected requests.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope to get blocked relationships.
     */
    public function scopeBlocked($query)
    {
        return $query->where('status', 'blocked');
    }

    /**
     * Check if the relationship is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if the relationship is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Approve the relationship.
     */
    public function approve(string $trainerNotes = null): void
    {
        $this->update([
            'status' => 'approved',
            'trainer_notes' => $trainerNotes,
            'responded_at' => now(),
        ]);
    }

    /**
     * Reject the relationship.
     */
    public function reject(string $trainerNotes = null): void
    {
        $this->update([
            'status' => 'rejected',
            'trainer_notes' => $trainerNotes,
            'responded_at' => now(),
        ]);
    }

    /**
     * Block the relationship.
     */
    public function block(string $trainerNotes = null): void
    {
        $this->update([
            'status' => 'blocked',
            'trainer_notes' => $trainerNotes,
            'responded_at' => now(),
        ]);
    }
} 