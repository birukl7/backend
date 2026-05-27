<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_screenings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_enabled')->default(false);
            $table->text('intro_message')->nullable();
            // criteria: array of strings the AI will look for
            //   e.g. ["3+ years React", "team leadership experience"]
            $table->json('criteria')->nullable();
            // questions: array of { id, text, type:'open'|'yes_no'|'multi',
            //                       options?:[], required:bool, weight:1-5 }
            $table->json('questions')->nullable();
            $table->unsignedTinyInteger('passing_score')->default(60);
            $table->unsignedTinyInteger('auto_reject_below')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_screenings');
    }
};
