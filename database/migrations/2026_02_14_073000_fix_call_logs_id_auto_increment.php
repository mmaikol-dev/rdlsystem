<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('call_logs')) {
            return;
        }

        $driver = DB::connection()->getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        // If there are duplicate (or null/zero) IDs, re-sequence them first so a PK can be added.
        $hasDuplicateIds = DB::selectOne(
            "SELECT 1
             FROM `call_logs`
             GROUP BY `id`
             HAVING `id` IS NULL OR `id` = 0 OR COUNT(*) > 1
             LIMIT 1"
        );

        if ($hasDuplicateIds) {
            DB::statement('SET @next_id := 0');
            DB::statement(
                'UPDATE `call_logs`
                 SET `id` = (@next_id := @next_id + 1)
                 ORDER BY `id` ASC, `created_at` ASC, `updated_at` ASC'
            );
        }

        // Add PRIMARY KEY on `id` if missing first (required before AUTO_INCREMENT).
        $pk = DB::selectOne(
            "SELECT tc.CONSTRAINT_NAME
             FROM information_schema.TABLE_CONSTRAINTS tc
             WHERE tc.TABLE_SCHEMA = DATABASE()
               AND tc.TABLE_NAME = 'call_logs'
               AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
             LIMIT 1"
        );

        if (! $pk) {
            DB::statement('ALTER TABLE `call_logs` ADD PRIMARY KEY (`id`)');
        }

        // Ensure `id` is an unsigned big integer auto-increment column.
        DB::statement('ALTER TABLE `call_logs` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    }

    public function down(): void
    {
        // Intentionally left as no-op: reverting auto-increment primary key is unsafe.
    }
};
