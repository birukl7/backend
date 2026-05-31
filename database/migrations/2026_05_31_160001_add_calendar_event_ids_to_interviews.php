<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interviews', function (Blueprint $table) {
            $table->string('seeker_calendar_event_id')->nullable()->after('status');
            $table->string('employer_calendar_event_id')->nullable()->after('seeker_calendar_event_id');
        });
    }

    public function down(): void
    {
        Schema::table('interviews', function (Blueprint $table) {
            $table->dropColumn(['seeker_calendar_event_id', 'employer_calendar_event_id']);
        });
    }
};
