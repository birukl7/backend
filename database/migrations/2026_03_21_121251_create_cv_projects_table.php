<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cv_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(App\Models\Cv::class)->constrained()->onDelete('cascade');
            $table->string('project_name');
            $table->text('description')->nullable();
            $table->string('url')->nullable();
            $table->string('tech_stack')->nullable(); // comma-separated tags
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cv_projects');
    }
};