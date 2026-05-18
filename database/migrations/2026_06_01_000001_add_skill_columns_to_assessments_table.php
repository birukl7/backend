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
        Schema::table('assessments', function (Blueprint $table) {
            $table->string('skill_name')->after('title');
            $table->string('category')->default('general')->after('skill_name');
            $table->enum('difficulty', ['beginner', 'intermediate', 'advanced'])->default('beginner')->after('category');
            $table->unsignedInteger('time_limit_minutes')->default(10)->after('difficulty');
            $table->unsignedInteger('pass_score')->default(70)->after('time_limit_minutes'); // percentage (0-100)
            $table->boolean('is_active')->default(true)->after('pass_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['skill_name', 'category', 'difficulty', 'time_limit_minutes', 'pass_score', 'is_active']);
        });
    }
};
