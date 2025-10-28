<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp', function (Blueprint $table) {
            $table->string('cc_agents')->nullable()->after('id'); // you can change position
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp', function (Blueprint $table) {
            $table->dropColumn('cc_agents');
        });
    }
};
