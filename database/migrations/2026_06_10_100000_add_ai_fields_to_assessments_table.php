<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            // nullable — NULL = global quiz, set = user-specific AI quiz
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->onDelete('cascade');
            $table->boolean('is_ai_generated')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'is_ai_generated']);
        });
    }
};
