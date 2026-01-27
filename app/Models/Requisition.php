<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Requisition extends Model
{
    use HasFactory;

    // protected $fillable = [
    //     'requisition_number',
    //     'category_id',
    //     'user_id',
    //     'title',
    //     'description',
    //     'total_amount',
    //     'status',
    //     'requisition_date',
    //     'daily_budget_id',
    //     'approved_at',
    //     'paid_at',
    //     'approved_by',
    // ];

protected $guarded = [];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'requisition_date' => 'date',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($requisition) {
            $requisition->requisition_number = 'REQ-' . date('Ymd') . '-' . str_pad(
                static::whereDate('created_at', today())->count() + 1,
                4,
                '0',
                STR_PAD_LEFT
            );
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(RequisitionCategory::class, 'category_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function dailyBudget(): BelongsTo
    {
        return $this->belongsTo(DailyBudget::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RequisitionItem::class);
    }
}