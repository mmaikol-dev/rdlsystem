<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_top_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_budget_id')->constrained('daily_budgets');
            $table->decimal('amount', 15, 2);
            $table->text('reason')->nullable();
            $table->foreignId('added_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_top_ups');
    }
};