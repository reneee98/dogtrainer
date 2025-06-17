<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
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
        'booking_id',
        'session_id',
        'rating',
        'comment',
        'feedback_categories',
        'is_public',
        'reply_by',
        'reply',
        'replied_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'rating' => 'integer',
        'feedback_categories' => 'array',
        'is_public' => 'boolean',
        'replied_at' => 'datetime',
    ];

    /**
     * Get the dog this review is for.
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Get the trainer being reviewed.
     */
    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    /**
     * Get the booking this review is for.
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the session this review is for.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class);
    }

    /**
     * Get the user who replied to this review.
     */
    public function replier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reply_by');
    }

    /**
     * Scope to get public reviews.
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * Scope to get reviews with specific rating.
     */
    public function scopeRating($query, int $rating)
    {
        return $query->where('rating', $rating);
    }

    /**
     * Scope to get reviews with rating >= threshold.
     */
    public function scopeMinRating($query, int $rating)
    {
        return $query->where('rating', '>=', $rating);
    }

    /**
     * Scope to get reviews with replies.
     */
    public function scopeWithReplies($query)
    {
        return $query->whereNotNull('reply');
    }

    /**
     * Scope to get reviews without replies.
     */
    public function scopeWithoutReplies($query)
    {
        return $query->whereNull('reply');
    }

    /**
     * Add reply from trainer.
     */
    public function addReply(string $reply, string $replyBy): bool
    {
        $this->update([
            'reply' => $reply,
            'reply_by' => $replyBy,
            'replied_at' => now(),
        ]);

        return true;
    }

    /**
     * Check if review has reply.
     */
    public function hasReply(): bool
    {
        return !empty($this->reply);
    }

    /**
     * Get star rating display.
     */
    public function getStarsAttribute(): string
    {
        return str_repeat('★', $this->rating) . str_repeat('☆', 5 - $this->rating);
    }

    /**
     * Get rating text.
     */
    public function getRatingTextAttribute(): string
    {
        return match($this->rating) {
            1 => 'Veľmi zlé',
            2 => 'Zlé',
            3 => 'Priemerné',
            4 => 'Dobré',
            5 => 'Výborné',
            default => 'Nehodnotené',
        };
    }

    /**
     * Get review source (booking or session).
     */
    public function getSourceAttribute(): string
    {
        if ($this->booking_id) {
            return 'booking';
        } elseif ($this->session_id) {
            return 'session';
        }
        return 'unknown';
    }

    /**
     * Get average rating for specific trainer.
     */
    public static function averageRatingForTrainer(string $trainerId): float
    {
        return self::where('trainer_id', $trainerId)
                   ->where('is_public', true)
                   ->avg('rating') ?? 0;
    }

    /**
     * Get review count for specific trainer.
     */
    public static function countForTrainer(string $trainerId): int
    {
        return self::where('trainer_id', $trainerId)
                   ->where('is_public', true)
                   ->count();
    }

    /**
     * Get rating distribution for trainer.
     */
    public static function ratingDistributionForTrainer(string $trainerId): array
    {
        $distribution = self::where('trainer_id', $trainerId)
                           ->where('is_public', true)
                           ->selectRaw('rating, COUNT(*) as count')
                           ->groupBy('rating')
                           ->pluck('count', 'rating')
                           ->toArray();

        // Ensure all ratings 1-5 are represented
        for ($i = 1; $i <= 5; $i++) {
            if (!isset($distribution[$i])) {
                $distribution[$i] = 0;
            }
        }

        ksort($distribution);
        return $distribution;
    }
} 