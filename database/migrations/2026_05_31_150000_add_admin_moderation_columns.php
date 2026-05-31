<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vacancies', function (Blueprint $table) {
            $table->string('moderation_status')->default('approved')->after('status');
            $table->boolean('is_archived')->default(false)->after('moderation_status');
            $table->boolean('is_flagged_suspicious')->default(false)->after('is_archived');
            $table->text('moderation_notes')->nullable()->after('is_flagged_suspicious');
            $table->timestamp('moderated_at')->nullable()->after('moderation_notes');
            $table->foreignId('moderated_by')->nullable()->after('moderated_at')->constrained('users')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_flagged_suspicious')->default(false)->after('remember_token');
            $table->string('account_status')->default('active')->after('is_flagged_suspicious');
            $table->text('security_notes')->nullable()->after('account_status');
            $table->timestamp('security_flagged_at')->nullable()->after('security_notes');
            $table->foreignId('security_flagged_by')->nullable()->after('security_flagged_at')->constrained('users')->nullOnDelete();
            $table->timestamp('status_changed_at')->nullable()->after('security_flagged_by');
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->string('approval_status')->default('approved')->after('is_ai_generated');
            $table->text('content_moderation_notes')->nullable()->after('approval_status');
            $table->timestamp('content_moderated_at')->nullable()->after('content_moderation_notes');
            $table->foreignId('content_moderated_by')->nullable()->after('content_moderated_at')->constrained('users')->nullOnDelete();
        });

        Schema::table('cvs', function (Blueprint $table) {
            $table->string('summary_approval_status')->default('approved')->after('summary');
            $table->text('summary_moderation_notes')->nullable()->after('summary_approval_status');
            $table->timestamp('summary_moderated_at')->nullable()->after('summary_moderation_notes');
            $table->foreignId('summary_moderated_by')->nullable()->after('summary_moderated_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cvs', function (Blueprint $table) {
            $table->dropForeign(['summary_moderated_by']);
            $table->dropColumn([
                'summary_approval_status',
                'summary_moderation_notes',
                'summary_moderated_at',
                'summary_moderated_by',
            ]);
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropForeign(['content_moderated_by']);
            $table->dropColumn([
                'approval_status',
                'content_moderation_notes',
                'content_moderated_at',
                'content_moderated_by',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['security_flagged_by']);
            $table->dropColumn([
                'is_flagged_suspicious',
                'account_status',
                'security_notes',
                'security_flagged_at',
                'security_flagged_by',
                'status_changed_at',
            ]);
        });

        Schema::table('vacancies', function (Blueprint $table) {
            $table->dropForeign(['moderated_by']);
            $table->dropColumn([
                'moderation_status',
                'is_archived',
                'is_flagged_suspicious',
                'moderation_notes',
                'moderated_at',
                'moderated_by',
            ]);
        });
    }
};
