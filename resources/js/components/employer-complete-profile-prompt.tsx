import { Link, usePage } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import { resolveAppRole } from '@/config/navigation';
import { useSidebar } from '@/components/ui/sidebar';
import type { Auth, User } from '@/types';

function shouldShowPrompt(user: User): boolean {
    return Boolean(user.should_show_employer_verification_prompt);
}

export function EmployerCompleteProfilePrompt() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { state } = useSidebar();
    const role = resolveAppRole(auth.roles);

    if (role !== 'employer' || !shouldShowPrompt(auth.user)) {
        return null;
    }

    const isCollapsed = state === 'collapsed';
    const needsCompletion = Boolean(auth.user.needs_employer_profile_completion);
    const href = '/settings/employer-verification';

    if (isCollapsed) {
        return (
            <Link
                href={href}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                title="Complete your profile"
            >
                <ShieldAlert className="h-4 w-4" />
            </Link>
        );
    }

    return (
        <Link
            href={href}
            className="block rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100/80 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
        >
            <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-100">
                        Complete your profile
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/80">
                        {needsCompletion
                            ? 'Submit your National ID (FAN) and verification details to start hiring.'
                            : 'Your verification was rejected. Update your details and resubmit.'}
                    </p>
                    <span className="mt-2 inline-flex text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Continue →
                    </span>
                </div>
            </div>
        </Link>
    );
}
