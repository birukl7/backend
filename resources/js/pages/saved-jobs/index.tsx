import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import JobListings from '@/components/job-listings';

interface EmployerStats {
    employer_id: number;
    employer_name: string | null;
    total_jobs: number;
    total_applications: number;
    total_hires: number;
    hires_last_30_days: number;
    hire_rate: number;
    member_since: string | null;
}

interface Vacancy {
    id: number;
    user_id: number;
    title: string;
    description: string;
    requirements: string | null;
    tags?: string[] | null;
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
    is_expired?: boolean;
    employer_stats?: EmployerStats | null;
}

interface UserCv {
    id: number;
    title: string;
    full_name: string | null;
    is_default: boolean;
}

interface SidebarStats {
    applied: number;
    interviews: number;
    skills_earned: number;
    cvs_count: number;
    saved?: number;
}

interface Props {
    vacancies: Vacancy[];
    saved_ids: number[];
    applied_ids: number[];
    user_cvs: UserCv[];
    ai_matches?: Record<number, number>;
    sidebar_stats?: SidebarStats | null;
    profile_completion?: number;
    is_authenticated?: boolean;
}

export default function SavedJobsIndex({
    vacancies,
    saved_ids,
    applied_ids,
    user_cvs,
    ai_matches = {},
    sidebar_stats,
    profile_completion = 0,
    is_authenticated = true,
}: Props) {
    return (
        <AppLayout>
            <Head title="Saved Jobs" />
            <div className="flex h-full flex-1 flex-col overflow-x-auto">
                <JobListings
                    vacancies={vacancies}
                    saved_ids={saved_ids}
                    applied_ids={applied_ids}
                    user_cvs={user_cvs}
                    ai_matches={ai_matches}
                    sidebar_stats={sidebar_stats}
                    profile_completion={profile_completion}
                    is_authenticated={is_authenticated}
                    pageMode="saved"
                />
            </div>
        </AppLayout>
    );
}
