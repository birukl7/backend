<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            // Advanced filtering tags (skills, perks, seniority, etc.)
            $table->json('tags')->nullable()->after('requirements');
        });

        // The application deadline is now mandatory and drives whether a job is
        // still open. Backfill any legacy rows that have no deadline so they
        // don't silently disappear from the (deadline-filtered) job board.
        DB::table('vacancies')
            ->whereNull('application_deadline')
            ->update(['application_deadline' => now()->addDays(30)->toDateString()]);
    }

    public function down(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            $table->dropColumn('tags');
        });
    }
};
