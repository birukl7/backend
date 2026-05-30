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
        title: 'Admin Dashboard',
        href: '/admin/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'User Management',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'Employer Verification',
        href: '/admin/employer-verifications',
        icon: Users,
    },
    {
        title: 'Company Verification',
        href: '/admin/company-verifications',
        icon: Building2,
    },
    {
        title: 'Job Moderation',
        href: '/admin/job-moderation',
        icon: Briefcase,
    },
    {
        title: 'Suspicious Users',
        href: '/admin/suspicious-users',
        icon: ShieldAlert,
    },
    {
        title: 'Content Approval',
        href: '/admin/content-approval?type=quizzes',
        icon: GraduationCap,
    },
    {
        title: 'Reports & Analytics',
        href: '/admin/reports',
        icon: BarChart3,
    },
];
