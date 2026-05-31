<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employer_type')->nullable()->after('company_website');
            $table->string('national_id')->nullable()->after('employer_type');

            $table->string('employer_verification_status')->default('pending')->after('national_id');
            $table->timestamp('employer_submitted_at')->nullable()->after('employer_verification_status');
            $table->timestamp('employer_verified_at')->nullable()->after('employer_submitted_at');
            $table->unsignedBigInteger('employer_verified_by')->nullable()->after('employer_verified_at');
            $table->text('employer_verification_notes')->nullable()->after('employer_verified_by');

            $table->string('company_tin_number')->nullable()->after('employer_verification_notes');
            $table->string('company_phone')->nullable()->after('company_tin_number');
            $table->string('company_contact_email')->nullable()->after('company_phone');
            $table->string('company_verification_status')->default('pending')->after('company_contact_email');
            $table->string('business_license_status')->default('pending')->after('company_verification_status');
            $table->string('business_license_path')->nullable()->after('business_license_status');
            $table->boolean('kyc_verified')->default(false)->after('business_license_path');
            $table->boolean('tin_verified')->default(false)->after('kyc_verified');
            $table->boolean('company_info_verified')->default(false)->after('tin_verified');
            $table->text('company_verification_notes')->nullable()->after('company_info_verified');
            $table->timestamp('company_submitted_at')->nullable()->after('company_verification_notes');
            $table->timestamp('company_verified_at')->nullable()->after('company_submitted_at');
            $table->unsignedBigInteger('company_verified_by')->nullable()->after('company_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'employer_type',
                'national_id',
                'employer_verification_status',
                'employer_submitted_at',
                'employer_verified_at',
                'employer_verified_by',
                'employer_verification_notes',
                'company_tin_number',
                'company_phone',
                'company_contact_email',
                'company_verification_status',
                'business_license_status',
                'business_license_path',
                'kyc_verified',
                'tin_verified',
                'company_info_verified',
                'company_verification_notes',
                'company_submitted_at',
                'company_verified_at',
                'company_verified_by',
            ]);
        });
    }
};
