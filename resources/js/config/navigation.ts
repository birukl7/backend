import {
    BarChart3,
    Bookmark,
    Briefcase,
    Calendar,
    FileText,
    GraduationCap,
    LayoutGrid,
    MessageSquare,
    Users,
    Workflow,
} from 'lucide-react';
import type { NavItem } from '@/types';

export type AppRole = 'employer' | 'job_seeker';

export function resolveAppRole(roles: string[] | undefined): AppRole {
    if (roles?.includes('employer')) {
        return 'employer';
    }

    return 'job_seeker';
}

export const employerNavItems: NavItem[] = [
    {
        title: 'nav.dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'nav.postedJobs',
        href: '/employer/jobs',
        icon: Briefcase,
    },
    {
        title: 'nav.applications',
        href: '/employer/applications',
        icon: Workflow,
    },
    {
        title: 'nav.interviews',
        href: '/employer/interviews',
        icon: Calendar,
    },
    {
        title: 'nav.messages',
        href: '/chat',
       
    },
];

export const jobSeekerNavItems: NavItem[] = [
    {
        title: 'nav.jobs',
        href: '/jobs',
        icon: Briefcase,
    },
    {
        title: 'nav.savedJobs',
        href: '/saved-jobs',
        icon: Bookmark,
    },
    {
        title: 'nav.myCVs',
        href: '/cv',
        icon: FileText,
    },
    {
        title: 'nav.applications',
        href: '/my-applications',
        icon: Users,
    },
    {
        title: 'nav.interviews',
        href: '/my-interviews',
        icon: Calendar,
    },
    {
        title: 'nav.quizzes',
        href: '/quiz',
        icon: GraduationCap,
    },
    {
        title: 'nav.hiringStats',
        href: '/hiring-statistics',
        icon: BarChart3,
    },
    {
        title: 'nav.messages',
        href: '/chat',
        icon: MessageSquare,
    },
];

export function getNavItemsForRole(role: AppRole): NavItem[] {
    return role === 'employer' ? employerNavItems : jobSeekerNavItems;
}
