import {
    BarChart3,
    Briefcase,
    Building2,
    GraduationCap,
    LayoutGrid,
    ShieldAlert,
    Users,
} from 'lucide-react';
import type { NavItem } from '@/types';

export const adminNavItems: NavItem[] = [
    {
        title: 'nav.adminDashboard',
        href: '/admin/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'nav.userManagement',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'nav.employerVerification',
        href: '/admin/employer-verifications',
        icon: Users,
    },
    {
        title: 'nav.companyVerification',
        href: '/admin/company-verifications',
        icon: Building2,
    },
    {
        title: 'nav.jobModeration',
        href: '/admin/job-moderation',
        icon: Briefcase,
    },
    {
        title: 'nav.suspiciousUsers',
        href: '/admin/suspicious-users',
        icon: ShieldAlert,
    },
    {
        title: 'nav.contentApproval',
        href: '/admin/content-approval?type=quizzes',
        icon: GraduationCap,
    },
    {
        title: 'nav.reportsAnalytics',
        href: '/admin/reports',
        icon: BarChart3,
    },
];
