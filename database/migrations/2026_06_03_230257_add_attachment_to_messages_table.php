<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->text('body')->nullable()->change();
            $table->string('attachment_path')->nullable()->after('body');
            $table->string('attachment_type', 16)->nullable()->after('attachment_path');
            $table->string('attachment_original_name')->nullable()->after('attachment_type');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['attachment_path', 'attachment_type', 'attachment_original_name']);
            $table->text('body')->nullable(false)->change();
        });
    }
};
