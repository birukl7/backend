<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('job_seeker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vacancy_id')->nullable()->constrained('vacancies')->nullOnDelete();
            $table->enum('status', ['active', 'closed'])->default('active');
            $table->timestamps();

            $table->unique(['employer_id', 'job_seeker_id', 'vacancy_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
