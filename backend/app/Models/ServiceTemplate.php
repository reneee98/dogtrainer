<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'color',
        'duration',
        'price',
        'description',
    ];

    protected $casts = [
        'duration' => 'decimal:1',
        'price' => 'decimal:2',
    ];

    /**
     * Get the user that owns this service template.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
