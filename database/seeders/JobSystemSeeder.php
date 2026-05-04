<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class JobSystemSeeder extends Seeder
{
    public function run(): void
    {
        // Get or create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'), // change in production
            ]
        );

        // Assign admin role (Spatie)
        if (!$admin->hasRole('admin')) {
            $admin->assignRole('admin');
        }

        $employmentTypes = ['full_time', 'part_time', 'contract', 'temporary', 'internship'];
        $statuses = ['open', 'closed'];
        $workTypes = ['remote', 'on_site', 'hybrid'];

        $titles = [
            'Frontend Developer',
            'Backend Developer',
            'Full Stack Engineer',
            'UI/UX Designer',
            'Project Manager',
            'Mobile App Developer',
            'DevOps Engineer',
            'QA Tester'
        ];

        foreach (range(1, 30) as $i) {
            $salaryMin = rand(5000, 15000);
            $salaryMax = $salaryMin + rand(2000, 10000);

            Vacancy::create([
                'user_id' => $admin->id, // 👈 always admin
                'title' => Arr::random($titles),
                'description' => 'We are looking for a talented professional to join our team.',
                'requirements' => 'Relevant experience and strong problem-solving skills.',
                'location' => Arr::random(['Addis Ababa', 'Remote', 'Hybrid']),
                'salary_min' => $salaryMin,
                'salary_max' => $salaryMax,
                'employment_type' => Arr::random($employmentTypes),
                'status' => Arr::random($statuses),
                'work_type' => Arr::random($workTypes),
                'application_deadline' => Carbon::now()->addDays(rand(7, 60)),
            ]);
        }
    }
}