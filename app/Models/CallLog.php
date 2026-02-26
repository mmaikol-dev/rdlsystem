<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallLog extends Model
{
    protected $fillable = [
        'session_id',
        'provider_session_id',
        'direction',
        'from_number',
        'to_number',
        'agent_user_id',
        'agent_client_name',
        'status',
        'is_missed',
        'started_at',
        'answered_at',
        'ended_at',
        'duration_seconds',
        'metadata',
    ];

    protected $casts = [
        'is_missed' => 'boolean',
        'duration_seconds' => 'integer',
        'metadata' => 'array',
        'started_at' => 'datetime',
        'answered_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_user_id');
    }
}
