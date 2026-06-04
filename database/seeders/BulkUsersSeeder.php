<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BulkUsersSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'password';

    public const EMPLOYER_COUNT = 50;

    public const JOB_SEEKER_COUNT = 50;

    public function run(): void
    {
        $password = Hash::make(self::DEMO_PASSWORD);

        for ($i = 1; $i <= self::JOB_SEEKER_COUNT; $i++) {
            $this->seedJobSeeker($i, $password);
        }

        for ($i = 1; $i <= self::EMPLOYER_COUNT; $i++) {
            $this->seedEmployer($i, $password);
        }

        $this->command?->info(sprintf(
            'Bulk users seeded: %d job seekers, %d employers (password: %s)',
            self::JOB_SEEKER_COUNT,
            self::EMPLOYER_COUNT,
            self::DEMO_PASSWORD,
        ));
    }

    private function seedJobSeeker(int $index, string $password): void
    {
        $email = sprintf('seed-seeker-%03d@skillchain.test', $index);

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => fake()->name()],
        );

        $user->forceFill([
            'password'          => $password,
            'email_verified_at' => $user->email_verified_at ?? now(),
            'headline'          => fake()->jobTitle(),
            'bio'               => fake()->optional(0.8)->paragraph(),
            'location'          => fake()->city().', Ethiopia',
            'account_status'    => 'active',
        ])->save();

        if (! $user->hasRole('job_seeker')) {
            $user->assignRole('job_seeker');
        }
    }

    private function seedEmployer(int $index, string $password): void
    {
        $email = sprintf('seed-employer-%03d@skillchain.test', $index);
        $companyName = fake()->company();

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => fake()->name()],
        );

        $user->forceFill([
            'password'                     => $password,
            'email_verified_at'            => $user->email_verified_at ?? now(),
            'employer_type'                => 'company',
            'company_name'                 => $companyName,
            'company_description'          => fake()->optional(0.7)->paragraph(),
            'company_website'              => fake()->optional(0.5)->url(),
            'location'                     => fake()->city().', Ethiopia',
            'employer_verification_status' => 'approved',
            'employer_verified_at'         => now(),
            'employer_submitted_at'        => now(),
            'company_verification_status'  => 'approved',
            'company_verified_at'          => now(),
            'company_submitted_at'         => now(),
            'account_status'               => 'active',
        ])->save();

        if (! $user->hasRole('employer')) {
            $user->assignRole('employer');
        }
    }
}
