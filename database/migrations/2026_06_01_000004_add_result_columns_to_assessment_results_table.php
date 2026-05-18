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
        Schema::table('assessment_results', function (Blueprint $table) {
            $table->boolean('passed')->default(false)->after('level');
            $table->unsignedInteger('time_taken_seconds')->nullable()->after('passed');
            $table->unsignedInteger('total_questions')->default(0)->after('time_taken_seconds');
            $table->unsignedInteger('correct_answers')->default(0)->after('total_questions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessment_results', function (Blueprint $table) {
            $table->dropColumn(['passed', 'time_taken_seconds', 'total_questions', 'correct_answers']);
        });
    }
};
