<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTopUp extends Model
{
    use HasFactory;

    protected $fillable = [
        'daily_budget_id',
        'amount',
        'reason',
        'added_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function dailyBudget(): BelongsTo
    {
        return $this->belongsTo(DailyBudget::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}