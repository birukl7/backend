import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { cn } from '@/lib/utils';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const hasBreadcrumbBar = breadcrumbs.length > 1;

    return (
        <AppShell variant="header">
            <div className="fixed inset-x-0 top-0 z-50 bg-background">
                <AppHeader breadcrumbs={breadcrumbs} />
            </div>
            <div
                className={cn('shrink-0', hasBreadcrumbBar ? 'h-28' : 'h-16')}
                aria-hidden
            />
            <AppContent variant="header">{children}</AppContent>
        </AppShell>
    );
}
