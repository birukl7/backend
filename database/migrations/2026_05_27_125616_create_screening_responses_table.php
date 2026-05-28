<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('screening_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('application_id')->nullable()->constrained()->nullOnDelete();

            // Full chat history: [{role:'ai'|'user', text, ts}]
            $table->json('transcript')->nullable();
            // Structured answers keyed by question id: { qid: "answer text" }
            $table->json('answers')->nullable();

            // AI evaluation (filled at /complete)
            $table->unsignedTinyInteger('ai_score')->nullable();
            $table->text('ai_summary')->nullable();
            $table->json('ai_strengths')->nullable();
            $table->json('ai_concerns')->nullable();
            $table->string('recommendation')->nullable();
            // strong_match | good_match | weak_match | not_recommended

            $table->string('status')->default('in_progress');
            // in_progress | completed | abandoned

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('screening_responses');
    }
};
