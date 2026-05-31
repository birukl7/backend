<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->text('extracted_text')->nullable()->after('mime_type');
            $table->timestamp('extracted_at')->nullable()->after('extracted_text');
        });
    }

    public function down(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->dropColumn(['extracted_text', 'extracted_at']);
        });
    }
};
