<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionWaitlist extends Model
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
        'notes',
        'joined_waitlist_at',
        'notified',
        'notified_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'joined_waitlist_at' => 'datetime',
        'notified' => 'boolean',
        'notified_at' => 'datetime',
    ];

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'session_waitlist';

    /**
     * Get the session this waitlist entry belongs to.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class);
    }

    /**
     * Get the dog on the waitlist.
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Scope to get entries ordered by join time.
     */
    public function scopeByJoinTime($query)
    {
        return $query->orderBy('joined_waitlist_at');
    }

    /**
     * Scope to get notified entries.
     */
    public function scopeNotified($query)
    {
        return $query->where('notified', true);
    }

    /**
     * Scope to get unnotified entries.
     */
    public function scopeUnnotified($query)
    {
        return $query->where('notified', false);
    }

    /**
     * Mark as notified.
     */
    public function markAsNotified(): bool
    {
        $this->update([
            'notified' => true,
            'notified_at' => now(),
        ]);

        return true;
    }

    /**
     * Get position in waitlist (1-based).
     */
    public function getPositionAttribute(): int
    {
        return self::where('session_id', $this->session_id)
                   ->where('joined_waitlist_at', '<=', $this->joined_waitlist_at)
                   ->count();
    }

    /**
     * Get how long the dog has been waiting.
     */
    public function getWaitingTimeAttribute(): string
    {
        $diff = $this->joined_waitlist_at->diffForHumans();
        return $diff;
    }
} 