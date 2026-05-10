<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(App\Models\Vacancy::class)->constrained()->onDelete('cascade');
            $table->foreignIdFor(App\Models\Cv::class)->constrained()->onDelete('cascade');
            $table->foreignIdFor(App\Models\User::class)->constrained()->onDelete('cascade');
            $table->text('cover_letter')->nullable();
            $table->enum('status', ['pending', 'applied', 'shortlisted', 'rejected', 'hired'])->default('pending');
            $table->timestamps();

            // A user can only apply once per vacancy
            $table->unique(['vacancy_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};