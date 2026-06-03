import { Head, Link, usePage } from '@inertiajs/react';
import { DashboardWelcome } from '@/components/dashboard-welcome';
import { PageContainer } from '@/components/ui/page-container';
import AppLayout from '@/layouts/app-layout';
import {
    getNavItemsForRole,
    resolveAppRole,
} from '@/config/navigation';
import type { Auth, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const role = resolveAppRole(auth.roles);
    const links = getNavItemsForRole(role);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <PageContainer>
                <DashboardWelcome className="mb-6" />

                <h2 className="mb-4 text-lg font-semibold text-foreground">
                    Quick links
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {links.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30"
                        >
                            {item.icon && (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <item.icon className="h-5 w-5" />
                                </span>
                            )}
                            <span>
                                <span className="block font-medium text-foreground group-hover:text-primary">
                                    {item.title}
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            </PageContainer>
        </AppLayout>
    );
}
