import { usePage } from '@inertiajs/react';
import { Briefcase, Sparkles } from 'lucide-react';
import { resolveAppRole } from '@/config/navigation';
import { getWelcomeContent } from '@/lib/welcome';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';

type DashboardWelcomeProps = {
    className?: string;
    /** Optional line shown under the description (e.g. job count). */
    meta?: string;
};

export function DashboardWelcome({ className, meta }: DashboardWelcomeProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const role = resolveAppRole(auth.roles);
    const content = getWelcomeContent(role, auth.user.name);
    const isEmployer = role === 'employer';

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border px-5 py-5 sm:px-6 sm:py-6',
                isEmployer
                    ? 'border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:via-sidebar dark:to-violet-950/30'
                    : 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:border-blue-900/50 dark:from-blue-950/40 dark:via-sidebar dark:to-emerald-950/30',
                className,
            )}
        >
            <div className="flex items-start gap-4">
                <div
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        isEmployer
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
                    )}
                >
                    {isEmployer ? (
                        <Briefcase className="h-5 w-5" aria-hidden />
                    ) : (
                        <Sparkles className="h-5 w-5" aria-hidden />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <span
                        className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
                            isEmployer
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200',
                        )}
                    >
                        {content.roleLabel}
                    </span>
                    <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                        {content.greeting}
                    </h1>
                    <p
                        className={cn(
                            'mt-0.5 text-sm font-medium',
                            isEmployer
                                ? 'text-indigo-700/90 dark:text-indigo-300'
                                : 'text-blue-700/90 dark:text-blue-300',
                        )}
                    >
                        {content.headline}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {content.description}
                    </p>
                    {meta && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {meta}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
