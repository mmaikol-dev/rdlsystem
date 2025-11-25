<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deductions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('agent_id')->constrained('users')->onDelete('cascade');
            $table->integer('quantity');
            $table->text('reason')->nullable();
            $table->string('deducted_by');
            $table->timestamps();
            
            $table->index(['product_id', 'agent_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deductions');
    }
};