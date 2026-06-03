import type { AppRole } from '@/config/navigation';

/** Public job board (jobs.index). Used by landing "Get started". */
export const JOBS_INDEX_PATH = '/jobs';

export type WelcomeContent = {
    roleLabel: string;
    greeting: string;
    headline: string;
    description: string;
};

export function getFirstName(fullName: string): string {
    const trimmed = fullName.trim();

    if (!trimmed) {
        return 'there';
    }

    return trimmed.split(/\s+/)[0] ?? 'there';
}

export function getWelcomeContent(
    role: AppRole,
    fullName: string,
): WelcomeContent {
    const firstName = getFirstName(fullName);

    if (role === 'employer') {
        return {
            roleLabel: 'Employer',
            greeting: `Welcome, ${firstName}!`,
            headline: 'Your hiring dashboard',
            description:
                'Manage job postings, review applications, and schedule interviews — all in one place.',
        };
    }

    return {
        roleLabel: 'Job Seeker',
        greeting: `Welcome, ${firstName}!`,
        headline: 'Your career hub',
        description:
            'Browse AI-matched opportunities, build your CV, and track applications and interviews.',
    };
}
