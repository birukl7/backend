import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import JobListings from "@/components/job-listings";

interface Vacancy {
    id: number;
    user_id: number;
    title: string;
    description: string;
    requirements: string | null;
    location: string | null;
    salary_min: string | null;
    salary_max: string | null;
    employment_type: "full_time" | "part_time" | "contract" | "temporary" | "internship";
    status: "open" | "closed";
    work_type: "remote" | "on_site" | "hybrid";
    application_deadline: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    vacancies: Vacancy[];
}

export default function Index({ vacancies }: Props) {
    return (
        <AppLayout>
            <Head title="Jobs" />
            <div className="flex h-full flex-1 flex-col overflow-x-auto">
                <JobListings vacancies={vacancies} />
            </div>
        </AppLayout>
    );
}