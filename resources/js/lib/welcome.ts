import type { AppRole } from '@/config/navigation';

/** Public job board (jobs.index). Used by landing "Get started". */
export const JOBS_INDEX_PATH = '/jobs';

export type WelcomeContent = {
    greeting: string;
    tagline: string;
};

export function getFirstName(fullName: string): string {
    const trimmed = fullName.trim();

    if (!trimmed) {
        return 'there';
    }

    return trimmed.split(/\s+/)[0] ?? 'there';
}

export function getTimeGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';

    return 'Good evening';
}

export function getWelcomeContent(
    role: AppRole,
    fullName: string,
): WelcomeContent {
    const firstName = getFirstName(fullName);
    const greeting = `${getTimeGreeting()}, ${firstName}`;

    if (role === 'employer') {
        return {
            greeting,
            tagline: 'Hiring overview',
        };
    }

    return {
        greeting,
        tagline: 'Career hub',
    };
}
