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
        Schema::table('sheet_orders', function (Blueprint $table) {
            $table->text('comments')->nullable()->after('id'); // Adjust 'id' to place it after the column you want
            $table->boolean('confirmed')->default(0)->after('comments'); // Using boolean (tinyint) with default 0
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sheet_orders', function (Blueprint $table) {
            $table->dropColumn(['comments', 'confirmed']);
        });
    }
};