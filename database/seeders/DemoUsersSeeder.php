<?php

namespace Database\Seeders;

use App\Models\Cv;
use App\Models\CvEducation;
use App\Models\CvExperience;
use App\Models\CvSkill;
use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoUsersSeeder extends Seeder
{
    public const SEEKER_EMAIL = 'jobseeker@skillchain.com';

    public const EMPLOYER_EMAIL = 'employer@skillchain.com';

    public const DEMO_PASSWORD = 'password';

    public function run(): void
    {
        $seeker = $this->seedJobSeeker();
        $employer = $this->seedEmployer();

        $this->command?->info('Demo accounts seeded:');
        $this->command?->info('  Job seeker: '.self::SEEKER_EMAIL.' / '.self::DEMO_PASSWORD);
        $this->command?->info('  Employer:   '.self::EMPLOYER_EMAIL.' / '.self::DEMO_PASSWORD);
    }

    private function seedJobSeeker(): User
    {
        $seeker = User::firstOrCreate(
            ['email' => self::SEEKER_EMAIL],
            ['name' => 'Sara Bekele'],
        );

        $seeker->forceFill([
            'password'          => bcrypt(self::DEMO_PASSWORD),
            'email_verified_at' => $seeker->email_verified_at ?? now(),
            'headline'          => 'UI/UX Designer & Frontend Developer',
            'bio'               => 'Product-minded designer and frontend engineer based in Addis Ababa.',
            'location'          => 'Addis Ababa, Ethiopia',
        ])->save();

        if (! $seeker->hasRole('job_seeker')) {
            $seeker->assignRole('job_seeker');
        }

        $this->seedCv($seeker, $this->uiUxCvDefinition(), isDefault: true);
        $this->seedCv($seeker, $this->frontendCvDefinition(), isDefault: false);

        return $seeker;
    }

    private function seedEmployer(): User
    {
        $employer = User::firstOrCreate(
            ['email' => self::EMPLOYER_EMAIL],
            ['name' => 'Meron Tadesse'],
        );

        $employer->forceFill([
            'password'          => bcrypt(self::DEMO_PASSWORD),
            'email_verified_at' => $employer->email_verified_at ?? now(),
            'company_name'        => 'Horizon Digital Studio',
            'company_description' => 'A product studio in Addis Ababa building web and mobile experiences for startups and enterprises across East Africa.',
            'company_website'     => 'https://horizondigital.example.com',
            'location'            => 'Addis Ababa, Ethiopia',
        ])->save();

        if (! $employer->hasRole('employer')) {
            $employer->assignRole('employer');
        }

        $this->seedVacancy($employer, $this->uiUxVacancyDefinition());
        $this->seedVacancy($employer, $this->frontendVacancyDefinition());

        return $employer;
    }

    private function seedCv(User $user, array $definition, bool $isDefault): void
    {
        $cv = Cv::firstOrCreate(
            [
                'user_id' => $user->id,
                'title'   => $definition['title'],
            ],
            [
                'template'      => 'classic',
                'source'        => 'builder',
                'is_default'    => $isDefault,
                'accent_color'  => '#2563eb',
                'section_order' => ['experience', 'education', 'skills', 'projects'],
                'full_name'     => $user->name,
                'email'         => $user->email,
                'location'      => 'Addis Ababa, Ethiopia',
                'summary'       => $definition['summary'],
                'linkedin'      => 'https://linkedin.com/in/sara-bekele-demo',
                'github'        => $definition['github'] ?? null,
            ],
        );

        $cv->forceFill([
            'template'      => 'classic',
            'is_default'    => $isDefault,
            'summary'       => $definition['summary'],
            'github'        => $definition['github'] ?? $cv->github,
        ])->save();

        $cv->experiences()->delete();
        foreach ($definition['experiences'] as $i => $exp) {
            CvExperience::create(array_merge($exp, ['cv_id' => $cv->id, 'sort_order' => $i]));
        }

        $cv->educations()->delete();
        foreach ($definition['educations'] as $i => $edu) {
            CvEducation::create(array_merge($edu, ['cv_id' => $cv->id, 'sort_order' => $i]));
        }

        $cv->skills()->delete();
        foreach ($definition['skills'] as $i => $skill) {
            CvSkill::create(array_merge($skill, ['cv_id' => $cv->id, 'sort_order' => $i]));
        }
    }

    private function seedVacancy(User $employer, array $definition): void
    {
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

    private function uiUxCvDefinition(): array
    {
        return [
            'title'   => 'UI/UX Design',
            'summary' => 'UI/UX designer with 4+ years crafting accessible, research-driven interfaces for web and mobile products. Strong in design systems, prototyping, and handoff to engineering teams.',
            'github'  => null,
            'experiences' => [
                [
                    'job_title'    => 'Senior UI/UX Designer',
                    'company_name' => 'ArifPay Labs',
                    'location'     => 'Addis Ababa',
                    'description'  => 'Led end-to-end design for a fintech dashboard used by 50k+ merchants. Ran usability tests, built a Figma design system, and improved task completion by 28%.',
                    'start_date'   => '2022-03-01',
                    'end_date'     => null,
                    'is_current'   => true,
                ],
                [
                    'job_title'    => 'Product Designer',
                    'company_name' => 'Ride Ethiopia',
                    'location'     => 'Addis Ababa',
                    'description'  => 'Redesigned rider and driver apps, created wireframes and high-fidelity prototypes, and partnered with PMs on onboarding flows.',
                    'start_date'   => '2020-01-01',
                    'end_date'     => '2022-02-28',
                    'is_current'   => false,
                ],
                [
                    'job_title'    => 'Junior UX Designer',
                    'company_name' => 'HubTech Ethiopia',
                    'location'     => 'Addis Ababa',
                    'description'  => 'Supported user interviews, affinity mapping, and UI polish for an ed-tech MVP.',
                    'start_date'   => '2018-06-01',
                    'end_date'     => '2019-12-31',
                    'is_current'   => false,
                ],
            ],
            'educations' => [
                [
                    'institution_name' => 'Addis Ababa University',
                    'degree'           => 'Bachelor of Arts',
                    'field_of_study'   => 'Visual Communication Design',
                    'location'         => 'Addis Ababa',
                    'description'      => 'Focus on human-centered design, typography, and digital media.',
                    'start_date'       => '2014-09-01',
                    'end_date'         => '2018-07-15',
                    'is_current'       => false,
                ],
                [
                    'institution_name' => 'Addis Ababa Science and Technology University',
                    'degree'           => 'Professional Certificate',
                    'field_of_study'   => 'Human-Computer Interaction',
                    'location'         => 'Addis Ababa',
                    'description'      => 'Evening program covering UX research methods and interaction design patterns.',
                    'start_date'       => '2019-01-01',
                    'end_date'         => '2019-12-20',
                    'is_current'       => false,
                ],
            ],
            'skills' => [
                ['skill_name' => 'Figma', 'proficiency_level' => 'expert', 'category' => 'Design Tools'],
                ['skill_name' => 'Adobe XD', 'proficiency_level' => 'advanced', 'category' => 'Design Tools'],
                ['skill_name' => 'User Research', 'proficiency_level' => 'advanced', 'category' => 'UX'],
                ['skill_name' => 'Wireframing', 'proficiency_level' => 'expert', 'category' => 'UX'],
                ['skill_name' => 'Prototyping', 'proficiency_level' => 'expert', 'category' => 'UX'],
                ['skill_name' => 'Design Systems', 'proficiency_level' => 'advanced', 'category' => 'UX'],
                ['skill_name' => 'Accessibility (WCAG)', 'proficiency_level' => 'intermediate', 'category' => 'UX'],
                ['skill_name' => 'HTML & CSS', 'proficiency_level' => 'intermediate', 'category' => 'Technical'],
            ],
        ];
    }

    private function frontendCvDefinition(): array
    {
        return [
            'title'   => 'Frontend Developer',
            'summary' => 'Frontend developer specializing in React and TypeScript. Experienced building responsive SPAs, integrating REST APIs, and collaborating with designers on pixel-perfect implementations.',
            'github'  => 'https://github.com/sara-bekele-demo',
            'experiences' => [
                [
                    'job_title'    => 'Frontend Developer',
                    'company_name' => 'ArifPay Labs',
                    'location'     => 'Addis Ababa',
                    'description'  => 'Built merchant portal features with React, TypeScript, and Tailwind. Introduced component tests and cut bundle size by 18%.',
                    'start_date'   => '2022-03-01',
                    'end_date'     => null,
                    'is_current'   => true,
                ],
                [
                    'job_title'    => 'Junior Frontend Engineer',
                    'company_name' => 'ICE Addis',
                    'location'     => 'Addis Ababa',
                    'description'  => 'Developed marketing sites and internal tools using Vue.js and Laravel APIs.',
                    'start_date'   => '2020-01-01',
                    'end_date'     => '2022-02-28',
                    'is_current'   => false,
                ],
                [
                    'job_title'    => 'Web Developer Intern',
                    'company_name' => 'HubTech Ethiopia',
                    'location'     => 'Addis Ababa',
                    'description'  => 'Implemented responsive layouts and fixed cross-browser issues for client projects.',
                    'start_date'   => '2018-06-01',
                    'end_date'     => '2019-12-31',
                    'is_current'   => false,
                ],
            ],
            'educations' => [
                [
                    'institution_name' => 'Addis Ababa University',
                    'degree'           => 'Bachelor of Science',
                    'field_of_study'   => 'Computer Science',
                    'location'         => 'Addis Ababa',
                    'description'      => 'Coursework in algorithms, databases, and software engineering.',
                    'start_date'       => '2014-09-01',
                    'end_date'         => '2018-07-15',
                    'is_current'       => false,
                ],
                [
                    'institution_name' => 'Addis Ababa Science and Technology University',
                    'degree'           => 'Bachelor of Science',
                    'field_of_study'   => 'Software Engineering',
                    'location'         => 'Addis Ababa',
                    'description'      => 'Capstone: real-time job board prototype with React and Node.js.',
                    'start_date'       => '2018-09-01',
                    'end_date'         => '2020-06-30',
                    'is_current'       => false,
                ],
            ],
            'skills' => [
                ['skill_name' => 'React', 'proficiency_level' => 'expert', 'category' => 'Frontend'],
                ['skill_name' => 'TypeScript', 'proficiency_level' => 'advanced', 'category' => 'Frontend'],
                ['skill_name' => 'JavaScript', 'proficiency_level' => 'expert', 'category' => 'Frontend'],
                ['skill_name' => 'Tailwind CSS', 'proficiency_level' => 'advanced', 'category' => 'Frontend'],
                ['skill_name' => 'Vue.js', 'proficiency_level' => 'intermediate', 'category' => 'Frontend'],
                ['skill_name' => 'REST APIs', 'proficiency_level' => 'advanced', 'category' => 'Backend Integration'],
                ['skill_name' => 'Git', 'proficiency_level' => 'advanced', 'category' => 'Tools'],
                ['skill_name' => 'Vitest', 'proficiency_level' => 'intermediate', 'category' => 'Testing'],
            ],
        ];
    }

    private function uiUxVacancyDefinition(): array
    {
        return [
            'title'                => 'UI/UX Designer',
            'description'          => <<<'TEXT'
Horizon Digital Studio is looking for a UI/UX Designer to shape intuitive experiences for our fintech and SaaS clients.

You will own discovery workshops, user flows, wireframes, and high-fidelity prototypes in Figma. You will partner closely with frontend engineers to deliver accessible, consistent interfaces and evolve our shared design system.

What you will do:
• Run user interviews and synthesize insights into journey maps
• Design responsive web and mobile screens with clear interaction specs
• Maintain and extend our component library and documentation
• Present design rationale to stakeholders and iterate from feedback

We offer hybrid work in Addis Ababa, mentorship from senior designers, and meaningful ownership on greenfield products.
TEXT,
            'requirements'         => '3+ years in product or UX design. Strong Figma skills, portfolio with case studies, and experience collaborating with developers. Familiarity with design systems and WCAG basics preferred.',
            'tags'                 => ['Figma', 'UX Research', 'Design Systems', 'Prototyping', 'Mobile', 'WCAG'],
            'location'             => 'Addis Ababa',
            'salary_min'           => 35000,
            'salary_max'           => 55000,
            'employment_type'      => 'full_time',
            'work_type'            => 'hybrid',
            'application_deadline' => Carbon::now()->addDays(45),
        ];
    }

    private function frontendVacancyDefinition(): array
    {
        return [
            'title'                => 'Frontend Developer',
            'description'          => <<<'TEXT'
Join Horizon Digital Studio as a Frontend Developer and help us ship fast, polished web applications for startups across Ethiopia.

You will build features in React and TypeScript, integrate Laravel-backed APIs, and work with designers to implement responsive UIs with Tailwind CSS.

What you will do:
• Develop reusable components and pages for client dashboards
• Write unit tests with Vitest and participate in code reviews
• Optimize performance, accessibility, and cross-browser behavior
• Collaborate in agile sprints with backend and design teammates

This is a full-time hybrid role based in Addis Ababa with room to grow into a lead frontend position.
TEXT,
            'requirements'         => '2+ years building SPAs with React. Solid TypeScript, HTML/CSS, and Git experience. Comfort consuming REST APIs and working in a design-handoff workflow.',
            'tags'                 => ['React', 'TypeScript', 'Tailwind CSS', 'REST API', 'Vitest', 'Laravel'],
            'location'             => 'Addis Ababa',
            'salary_min'           => 40000,
            'salary_max'           => 65000,
            'employment_type'      => 'full_time',
            'work_type'            => 'hybrid',
            'application_deadline' => Carbon::now()->addDays(45),
        ];
    }
}
