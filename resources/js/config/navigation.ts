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
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Posted Jobs',
        href: '/employer/jobs',
        icon: Briefcase,
    },
    {
        title: 'Applications',
        href: '/employer/applications',
        icon: Workflow,
    },
    {
        title: 'Interviews',
        href: '/employer/interviews',
        icon: Calendar,
    },
    {
        title: 'Messages',
        href: '/chat',
        icon: MessageSquare,
    },
];

export const jobSeekerNavItems: NavItem[] = [
    {
        title: 'Jobs',
        href: '/jobs',
        icon: Briefcase,
    },
    {
        title: 'Saved Jobs',
        href: '/saved-jobs',
        icon: Bookmark,
    },
    {
        title: 'My CVs',
        href: '/cv',
        icon: FileText,
    },
    {
        title: 'Applications',
        href: '/my-applications',
        icon: Users,
    },
    {
        title: 'Interviews',
        href: '/my-interviews',
        icon: Calendar,
    },
    {
        title: 'Quizzes',
        href: '/quiz',
        icon: GraduationCap,
    },
    {
        title: 'Hiring Stats',
        href: '/hiring-statistics',
        icon: BarChart3,
    },
    {
        title: 'Messages',
        href: '/chat',
        icon: MessageSquare,
    },
];

export function getNavItemsForRole(role: AppRole): NavItem[] {
    return role === 'employer' ? employerNavItems : jobSeekerNavItems;
}
