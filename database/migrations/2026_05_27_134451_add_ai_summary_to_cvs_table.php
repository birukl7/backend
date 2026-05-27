<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->text('ai_summary')->nullable()->after('summary');
            $table->json('ai_suggestions')->nullable()->after('ai_summary');
            $table->json('ai_improvements')->nullable()->after('ai_suggestions');
            $table->unsignedTinyInteger('ai_strength_score')->nullable()->after('ai_improvements');
            $table->timestamp('ai_summary_generated_at')->nullable()->after('ai_strength_score');
        });
    }

    public function down(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->dropColumn([
                'ai_summary',
                'ai_suggestions',
                'ai_improvements',
                'ai_strength_score',
                'ai_summary_generated_at',
            ]);
        });
    }
};
