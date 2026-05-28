import { usePage } from '@inertiajs/react';
import { resolveAppRole } from '@/config/navigation';
import UserLayout from '@/layouts/app/app-header-layout';
import AdminLayout from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps, Auth } from '@/types';

export default function AppLayout({ children, breadcrumbs, ...props }: AppLayoutProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isEmployer = resolveAppRole(auth.roles) === 'employer';
    const Layout = isEmployer ? AdminLayout : UserLayout;

    return (
        <Layout breadcrumbs={breadcrumbs} {...props}>
            {children}
        </Layout>
    );
}