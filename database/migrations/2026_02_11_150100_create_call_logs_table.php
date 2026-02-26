<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_logs', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->nullable()->index();
            $table->string('provider_session_id')->nullable()->index();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->string('from_number')->nullable()->index();
            $table->string('to_number')->nullable()->index();
            $table->foreignId('agent_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('agent_client_name')->nullable();
            $table->string('status')->default('initiated')->index();
            $table->boolean('is_missed')->default(false)->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_logs');
    }
};
