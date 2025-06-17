<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dog extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'owner_id',
        'name',
        'breed',
        'age',
        'size',
        'gender',
        'weight',
        'photo_url',
        'medical_notes',
        'behavioral_notes',
        'vaccinations',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'age' => 'integer',
        'weight' => 'decimal:2',
        'vaccinations' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get the owner of this dog.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the bookings for this dog.
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the session signups for this dog.
     */
    public function sessionSignups(): HasMany
    {
        return $this->hasMany(SessionSignup::class);
    }

    /**
     * Get the session waitlist entries for this dog.
     */
    public function sessionWaitlist(): HasMany
    {
        return $this->hasMany(SessionWaitlist::class);
    }

    /**
     * Get the reviews for this dog.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Scope to get only active dogs.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by size.
     */
    public function scopeSize($query, $size)
    {
        return $query->where('size', $size);
    }

    /**
     * Scope to filter by breed.
     */
    public function scopeBreed($query, $breed)
    {
        return $query->where('breed', 'like', "%{$breed}%");
    }

    /**
     * Get the dog's age in human readable format.
     */
    public function getAgeTextAttribute(): string
    {
        if ($this->age === 1) {
            return '1 rok';
        } elseif ($this->age < 5) {
            return "{$this->age} roky";
        } else {
            return "{$this->age} rokov";
        }
    }

    /**
     * Get the dog's weight with unit.
     */
    public function getWeightTextAttribute(): string
    {
        return $this->weight ? "{$this->weight} kg" : '';
    }
} 