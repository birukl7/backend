<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class BulkUsersSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'password';

    public const EMPLOYER_COUNT = 100;

    public const JOB_SEEKER_COUNT = 100;

    private const SIGNUP_START_YEAR = 2026;

    private const SIGNUP_START_MONTH = 3;

    private const SIGNUP_START_DAY = 1;

    /** @var list<string> */
    private const FIRST_NAMES = [
        'Sara', 'Meron', 'Abel', 'Hanna', 'Dawit', 'Liya', 'Yonas', 'Selam',
        'Kidus', 'Betty', 'Samuel', 'Rahel', 'Daniel', 'Tigist', 'Michael',
        'Eden', 'Nahom', 'Helen', 'Bereket', 'Mimi',
    ];

    /** @var list<string> */
    private const LAST_NAMES = [
        'Bekele', 'Tadesse', 'Alemu', 'Gebre', 'Haile', 'Mekonnen', 'Desta',
        'Kebede', 'Assefa', 'Worku', 'Girma', 'Tesfaye', 'Mulugeta', 'Negash',
        'Wondimu', 'Fikadu', 'Demissie', 'Yohannes', 'Adane', 'Getachew',
    ];

    /** @var list<string> */
    private const JOB_SEEKER_HEADLINES = [
        'Frontend Developer',
        'Backend Developer',
        'Full Stack Engineer',
        'UI/UX Designer',
        'Data Analyst',
        'DevOps Engineer',
        'Mobile Developer',
        'QA Engineer',
        'Product Manager',
        'Digital Marketer',
    ];

    /** @var list<string> */
    private const COMPANY_NAMES = [
        'Horizon Digital Studio',
        'ArifPay Labs',
        'ICE Addis',
        'HubTech Ethiopia',
        'Blue Nile Software',
        'Addis Tech Solutions',
        'Highland Innovations',
        'Ethio Cloud Services',
        'Rift Valley Systems',
        'Lalibela Digital',
    ];

    /** @var list<string> */
    private const LOCATIONS = [
        'Addis Ababa',
        'Bahir Dar',
        'Hawassa',
        'Mekelle',
        'Adama',
        'Dire Dawa',
        'Jimma',
        'Gondar',
    ];

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
            'Bulk users seeded: %d job seekers, %d employers (password: %s, signup dates from %s)',
            self::JOB_SEEKER_COUNT,
            self::EMPLOYER_COUNT,
            self::DEMO_PASSWORD,
            $this->signupDate(0)->toDateString(),
        ));
    }

    private function seedJobSeeker(int $index, string $password): void
    {
        $email = sprintf('seed-seeker-%03d@skillchain.test', $index);
        $name = $this->personName($index);
        $location = $this->pick(self::LOCATIONS, $index);
        $signedUpAt = $this->signupDate($index - 1);

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => $name],
        );

        $user->forceFill([
            'password'       => $password,
            'headline'       => $this->pick(self::JOB_SEEKER_HEADLINES, $index),
            'bio'            => "{$name} is a job seeker based in {$location}, Ethiopia.",
            'location'       => "{$location}, Ethiopia",
            'account_status' => 'active',
        ])->save();

        $this->applySignupTimestamps($user, $signedUpAt);

        if (! $user->hasRole('job_seeker')) {
            $user->assignRole('job_seeker');
        }
    }

    private function seedEmployer(int $index, string $password): void
    {
        $email = sprintf('seed-employer-%03d@skillchain.test', $index);
        $name = $this->personName($index + 100);
        $companyName = $this->pick(self::COMPANY_NAMES, $index);
        $location = $this->pick(self::LOCATIONS, $index + 3);
        $slug = sprintf('company-%03d', $index);
        // Employers sign up after job seekers, one unique day each.
        $signedUpAt = $this->signupDate(self::JOB_SEEKER_COUNT + $index - 1);

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => $name],
        );

        $user->forceFill([
            'password'                     => $password,
            'employer_type'                => 'company',
            'company_name'                 => $companyName,
            'company_description'          => "{$companyName} hires talent across Ethiopia.",
            'company_website'              => "https://{$slug}.skillchain.test",
            'location'                     => "{$location}, Ethiopia",
            'employer_verification_status' => 'approved',
            'company_verification_status'  => 'approved',
            'account_status'               => 'active',
        ])->save();

        $this->applySignupTimestamps($user, $signedUpAt, [
            'employer_verified_at'  => $signedUpAt,
            'employer_submitted_at' => $signedUpAt,
            'company_verified_at'   => $signedUpAt,
            'company_submitted_at'  => $signedUpAt,
        ]);

        if (! $user->hasRole('employer')) {
            $user->assignRole('employer');
        }
    }

    private function applySignupTimestamps(User $user, Carbon $signedUpAt, array $extra = []): void
    {
        User::whereKey($user->id)->update(array_merge([
            'created_at'        => $signedUpAt,
            'updated_at'        => $signedUpAt,
            'email_verified_at' => $signedUpAt,
        ], $extra));
    }

    private function signupDate(int $dayOffset): Carbon
    {
        return Carbon::create(
            self::SIGNUP_START_YEAR,
            self::SIGNUP_START_MONTH,
            self::SIGNUP_START_DAY,
            10,
            0,
            0,
        )->addDays($dayOffset);
    }

    private function personName(int $index): string
    {
        $first = $this->pick(self::FIRST_NAMES, $index);
        $last = $this->pick(self::LAST_NAMES, $index + 7);

        return "{$first} {$last}";
    }

    /**
     * @param  list<string>  $items
     */
    private function pick(array $items, int $index): string
    {
        return $items[$index % count($items)];
    }
}
