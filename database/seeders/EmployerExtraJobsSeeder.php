<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class EmployerExtraJobsSeeder extends Seeder
{
    public function run(): void
    {
        $employer = User::where('email', DemoUsersSeeder::EMPLOYER_EMAIL)->first();

        if (! $employer) {
            $this->command?->warn(
                'Employer '.DemoUsersSeeder::EMPLOYER_EMAIL.' not found — run DemoUsersSeeder first.'
            );

            return;
        }

        foreach ($this->vacancyDefinitions() as $definition) {
            Vacancy::updateOrCreate(
                [
                    'user_id' => $employer->id,
                    'title'   => $definition['title'],
                ],
                array_merge($definition, [
                    'user_id' => $employer->id,
                    'status'  => 'open',
                ]),
            );
        }

        $this->command?->info('Extra employer jobs seeded for '.DemoUsersSeeder::EMPLOYER_EMAIL);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function vacancyDefinitions(): array
    {
        return [
            [
                'title'                => 'Backend Developer',
                'description'          => <<<'TEXT'
Horizon Digital Studio is hiring a Backend Developer to build reliable APIs and services for our client products.

You will design and implement Laravel-based backends, model data thoughtfully, and integrate third-party services such as payment gateways and notification providers. You will work closely with frontend engineers to define contracts and ship features in two-week sprints.

What you will do:
• Build RESTful APIs, background jobs, and database migrations
• Write automated tests and participate in code reviews
• Improve performance, security, and observability across services
• Collaborate with designers and PMs on technical feasibility

Hybrid role in Addis Ababa with mentorship from senior engineers and exposure to multiple industry verticals.
TEXT,
                'requirements'         => '2+ years with PHP/Laravel or similar MVC frameworks. Solid SQL, Git, and API design skills. Experience with queues, authentication, and testing preferred.',
                'tags'                 => ['Laravel', 'PHP', 'MySQL', 'REST API', 'Redis', 'PHPUnit'],
                'location'             => 'Addis Ababa',
                'salary_min'           => 42000,
                'salary_max'           => 68000,
                'employment_type'      => 'full_time',
                'work_type'            => 'hybrid',
                'application_deadline' => Carbon::now()->addDays(60),
            ],
            [
                'title'                => 'Product Manager',
                'description'          => <<<'TEXT'
Horizon Digital Studio seeks a Product Manager to own discovery, roadmap, and delivery for client-facing digital products.

You will translate business goals into user stories, prioritize backlogs with engineering and design, and keep stakeholders aligned through clear communication and measurable outcomes.

What you will do:
• Run discovery sessions and define MVP scope with clients
• Maintain product roadmaps, acceptance criteria, and release notes
• Track KPIs, gather feedback, and iterate based on user insights
• Facilitate sprint planning, demos, and retrospectives

Ideal for someone who enjoys working with startups and can balance speed with quality in a consultancy environment.
TEXT,
                'requirements'         => '2+ years in product management or business analysis for software products. Strong written communication, familiarity with agile workflows, and comfort working with designers and engineers.',
                'tags'                 => ['Product Management', 'Agile', 'Roadmapping', 'User Research', 'SaaS', 'Stakeholders'],
                'location'             => 'Addis Ababa',
                'salary_min'           => 38000,
                'salary_max'           => 60000,
                'employment_type'      => 'full_time',
                'work_type'            => 'on_site',
                'application_deadline' => Carbon::now()->addDays(60),
            ],
        ];
    }
}
