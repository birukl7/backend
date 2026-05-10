<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(App\Models\Application::class)->constrained()->onDelete('cascade');
            $table->foreignId('job_seeker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('employer_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('scheduled_at');
            $table->dateTime('rescheduled_at')->nullable(); // tracks reschedule history
            $table->string('room_id')->unique();            // Jitsi room slug
            $table->string('meeting_link');                 // full https://meet.jit.si/... URL
            $table->text('notes')->nullable();              // employer notes for candidate
            $table->string('timezone')->default('UTC');
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interviews');
    }
};