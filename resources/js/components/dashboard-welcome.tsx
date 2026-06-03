import { usePage } from '@inertiajs/react';
import { resolveAppRole } from '@/config/navigation';
import { getWelcomeContent } from '@/lib/welcome';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';

type DashboardWelcomeProps = {
    className?: string;
    /** Optional context line (e.g. job counts). */
    meta?: string;
};

export function DashboardWelcome({ className, meta }: DashboardWelcomeProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const role = resolveAppRole(auth.roles);
    const content = getWelcomeContent(role, auth.user.name);

    return (
        <header
            className={cn(
                'flex flex-col gap-1 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-baseline sm:justify-between dark:border-slate-700/80',
                className,
            )}
        >
            <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    {content.tagline}
                </p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                    {content.greeting}
                </h1>
            </div>
            {meta && (
                <p className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                    {meta}
                </p>
            )}
        </header>
    );
}
