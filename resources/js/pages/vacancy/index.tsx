import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import JobListings from '@/components/job-listings';
import AppLogo from '@/components/app-logo';

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
    applied_ids: number[];
    saved_ids?: number[];
    user_cvs: UserCv[];
    ai_matches?: Record<number, number>;
    ai_matching_hint?: string | null;
    ai_matching_debug?: Record<string, unknown> | null;
    sidebar_stats?: SidebarStats | null;
    profile_completion?: number;
    is_authenticated?: boolean;
}

function PublicHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2">
                    <AppLogo />
                </Link>
                <nav className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                        Sign up
                    </Link>
                </nav>
            </div>
        </header>
    );
}

export default function Index({
    vacancies,
    applied_ids,
    saved_ids = [],
    user_cvs,
    ai_matches = {},
    ai_matching_hint = null,
    ai_matching_debug = null,
    sidebar_stats,
    profile_completion = 0,
    is_authenticated = true,
}: Props) {
    const content = (
        <JobListings
            vacancies={vacancies}
            applied_ids={applied_ids}
            saved_ids={saved_ids}
            user_cvs={user_cvs}
            ai_matches={ai_matches}
            ai_matching_hint={ai_matching_hint}
            ai_matching_debug={ai_matching_debug}
            sidebar_stats={sidebar_stats}
            profile_completion={profile_completion}
            is_authenticated={is_authenticated}
        />
    );

    // Guests get a lightweight public chrome instead of the app shell.
    if (!is_authenticated) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Head title="Jobs" />
                <PublicHeader />
                <main className="mx-auto max-w-7xl">{content}</main>
            </div>
        );
    }

    return (
        <AppLayout>
            <Head title="Jobs" />
            <div className="flex h-full flex-1 flex-col overflow-x-auto">
                {content}
            </div>
        </AppLayout>
    );
}
