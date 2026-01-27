<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyBudget extends Model
{
    use HasFactory;


protected $guarded = []; // Allow everything temporarily

    protected $casts = [
        'budget_date' => 'date',
        'initial_amount' => 'decimal:2',
        'current_amount' => 'decimal:2',
        'spent_amount' => 'decimal:2',
    ];

    public function requisitions(): HasMany
    {
        return $this->hasMany(Requisition::class);
    }

    public function topUps(): HasMany
    {
        return $this->hasMany(BudgetTopUp::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BudgetTransaction::class);
    }

    public function deductAmount(float $amount): void
    {
        $this->current_amount -= $amount;
        $this->spent_amount += $amount;
        $this->save();
    }

    public function addAmount(float $amount): void
    {
        $this->current_amount += $amount;
        $this->initial_amount += $amount;
        $this->save();
    }
}