<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'bio',
        'avatar_url',
        'oauth_providers',
        'is_active',
        'email_notifications',
        'push_notifications',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'oauth_providers' => 'array',
        'is_active' => 'boolean',
        'email_notifications' => 'boolean',
        'push_notifications' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * Get the dogs owned by this user (if owner).
     */
    public function dogs(): HasMany
    {
        return $this->hasMany(Dog::class, 'owner_id');
    }

    /**
     * Get the sessions created by this user (if trainer).
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(Session::class, 'trainer_id');
    }

    /**
     * Get the bookings as trainer.
     */
    public function trainerBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'trainer_id');
    }

    /**
     * Get the daycare schedules created by this user (if trainer).
     */
    public function daycareSchedules(): HasMany
    {
        return $this->hasMany(DaycareSchedule::class, 'trainer_id');
    }

    /**
     * Get the reviews received by this trainer.
     */
    public function receivedReviews(): HasMany
    {
        return $this->hasMany(Review::class, 'trainer_id');
    }

    /**
     * Check if user is an owner.
     */
    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    /**
     * Check if user is a trainer.
     */
    public function isTrainer(): bool
    {
        return $this->role === 'trainer';
    }

    /**
     * Scope to get only owners.
     */
    public function scopeOwners($query)
    {
        return $query->where('role', 'owner');
    }

    /**
     * Scope to get only trainers.
     */
    public function scopeTrainers($query)
    {
        return $query->where('role', 'trainer');
    }

    /**
     * Scope to get only active users.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get trainer-client relationships where this user is the trainer.
     */
    public function clientRelationships(): HasMany
    {
        return $this->hasMany(\App\Models\TrainerClient::class, 'trainer_id');
    }

    /**
     * Get trainer-client relationships where this user is the client.
     */
    public function trainerRelationships(): HasMany
    {
        return $this->hasMany(\App\Models\TrainerClient::class, 'client_id');
    }

    /**
     * Get approved clients for this trainer.
     */
    public function approvedClients(): HasMany
    {
        return $this->hasMany(\App\Models\TrainerClient::class, 'trainer_id')->approved();
    }

    /**
     * Get approved trainers for this client.
     */
    public function approvedTrainers(): HasMany
    {
        return $this->hasMany(\App\Models\TrainerClient::class, 'client_id')->approved();
    }

    /**
     * Get pending client requests for this trainer.
     */
    public function pendingClientRequests(): HasMany
    {
        return $this->hasMany(\App\Models\TrainerClient::class, 'trainer_id')->pending();
    }

    /**
     * Check if this user has an approved relationship with a trainer/client.
     */
    public function hasApprovedRelationshipWith(string $userId): bool
    {
        if ($this->isTrainer()) {
            return $this->clientRelationships()->where('client_id', $userId)->approved()->exists();
        } else {
            return $this->trainerRelationships()->where('trainer_id', $userId)->approved()->exists();
        }
    }

    /**
     * Check if this user can access trainer's schedule.
     */
    public function canAccessTrainerSchedule(string $trainerId): bool
    {
        if ($this->isTrainer() && $this->id === $trainerId) {
            return true; // Trainer can access their own schedule
        }

        return $this->hasApprovedRelationshipWith($trainerId);
    }
}
 