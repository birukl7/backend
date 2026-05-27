import {
    Briefcase,
    Calendar,
    FileText,
    GraduationCap,
    LayoutGrid,
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
];

export const jobSeekerNavItems: NavItem[] = [
    {
        title: 'Jobs',
        href: '/jobs',
        icon: Briefcase,
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
];

export function getNavItemsForRole(role: AppRole): NavItem[] {
    return role === 'employer' ? employerNavItems : jobSeekerNavItems;
}
