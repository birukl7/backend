import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import JobListings from '@/components/job-listings';

interface Vacancy {
    id: number;
    user_id: number;
    title: string;
    description: string;
    requirements: string | null;
    location: string | null;
    salary_min: string | null;
    salary_max: string | null;
    employment_type:
        | 'full_time'
        | 'part_time'
        | 'contract'
        | 'temporary'
        | 'internship';
    status: 'open' | 'closed';
    work_type: 'remote' | 'on_site' | 'hybrid';
    application_deadline: string | null;
    created_at: string;
    updated_at: string;
}

interface UserCv {
    id: number;
    title: string;
    full_name: string | null;
    is_default: boolean;
}

interface Props {
    vacancies: Vacancy[];
    applied_ids: number[];
    user_cvs: UserCv[];
    ai_matches?: Record<number, number>; // vacancy_id -> score (0.0 – 1.0), absent when AI service is down
}

export default function Index({
    vacancies,
    applied_ids,
    user_cvs,
    ai_matches = {},
}: Props) {
    return (
        <AppLayout>
            <Head title="Jobs" />
            <div className="flex h-full flex-1 flex-col overflow-x-auto">
                <JobListings
                    vacancies={vacancies}
                    applied_ids={applied_ids}
                    user_cvs={user_cvs}
                    ai_matches={ai_matches}
                />
            </div>
        </AppLayout>
    );
}
