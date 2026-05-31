<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->string('source')->default('builder')->after('user_id');
            $table->string('file_path')->nullable()->after('photo_path');
            $table->string('original_filename')->nullable()->after('file_path');
            $table->string('mime_type')->nullable()->after('original_filename');
        });
    }

    public function down(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->dropColumn(['source', 'file_path', 'original_filename', 'mime_type']);
        });
    }
};
