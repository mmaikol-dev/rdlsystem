<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('product_code');
            $table->string('product_name');
            $table->string('barcode');
            $table->enum('operation_type', ['inbound', 'outbound']);
            $table->string('scanned_by');
            $table->unsignedBigInteger('user_id');
            $table->timestamp('scanned_at');
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('product_id')
                  ->references('id')
                  ->on('products')
                  ->onDelete('cascade');
            
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');

            // Indexes for better query performance
            $table->index(['product_id', 'scanned_at']);
            $table->index('barcode');
            $table->index('operation_type');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barcodes');
    }
};