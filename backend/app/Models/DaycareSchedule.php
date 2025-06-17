<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class DaycareSchedule extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'trainer_id',
        'title',
        'description',
        'location',
        'capacity',
        'waitlist_enabled',
        'days_of_week',
        'start_time',
        'end_time',
        'price',
        'is_active',
        'valid_from',
        'valid_until',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'capacity' => 'integer',
        'waitlist_enabled' => 'boolean',
        'days_of_week' => 'array',
        'start_time' => 'datetime:H:i:s',
        'end_time' => 'datetime:H:i:s',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
        'valid_from' => 'date',
        'valid_until' => 'date',
    ];

    /**
     * Get the trainer who created this schedule.
     */
    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id');
    }

    /**
     * Get the sessions generated from this schedule.
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(Session::class, 'schedule_id');
    }

    /**
     * Scope to get only active schedules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get schedules for a specific day of week.
     */
    public function scopeForDayOfWeek($query, int $dayOfWeek)
    {
        return $query->whereJsonContains('days_of_week', $dayOfWeek);
    }

    /**
     * Scope to get valid schedules for a date.
     */
    public function scopeValidForDate($query, Carbon $date)
    {
        return $query->where(function ($q) use ($date) {
            $q->where('valid_from', '<=', $date)
              ->where(function ($subQ) use ($date) {
                  $subQ->whereNull('valid_until')
                       ->orWhere('valid_until', '>=', $date);
              });
        });
    }

    /**
     * Check if schedule is valid for a specific date.
     */
    public function isValidForDate(Carbon $date): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->valid_from && $date->lt($this->valid_from)) {
            return false;
        }

        if ($this->valid_until && $date->gt($this->valid_until)) {
            return false;
        }

        return in_array($date->dayOfWeekIso, $this->days_of_week);
    }

    /**
     * Generate sessions for a date range.
     */
    public function generateSessionsForDateRange(Carbon $startDate, Carbon $endDate): array
    {
        $sessions = [];
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            if ($this->isValidForDate($currentDate)) {
                $sessions[] = [
                    'trainer_id' => $this->trainer_id,
                    'schedule_id' => $this->id,
                    'title' => $this->title,
                    'description' => $this->description,
                    'location' => $this->location,
                    'start_time' => $currentDate->copy()->setTimeFromTimeString($this->start_time),
                    'end_time' => $currentDate->copy()->setTimeFromTimeString($this->end_time),
                    'capacity' => $this->capacity,
                    'waitlist_enabled' => $this->waitlist_enabled,
                    'session_type' => 'daycare',
                    'price' => $this->price,
                ];
            }
            $currentDate->addDay();
        }

        return $sessions;
    }

    /**
     * Get formatted days of week.
     */
    public function getFormattedDaysAttribute(): string
    {
        $dayNames = [
            1 => 'Pondelok',
            2 => 'Utorok',
            3 => 'Streda',
            4 => 'Štvrtok',
            5 => 'Piatok',
            6 => 'Sobota',
            7 => 'Nedeľa',
        ];

        $formattedDays = array_map(function ($day) use ($dayNames) {
            return $dayNames[$day] ?? '';
        }, $this->days_of_week);

        return implode(', ', $formattedDays);
    }
} 