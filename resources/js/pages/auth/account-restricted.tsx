import { Form, Head } from '@inertiajs/react';
import { Ban, Mail } from 'lucide-react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { home, logout } from '@/routes';

type AccountStatus = 'suspended' | 'blocked';

type Props = {
    account_status: AccountStatus;
    support_email: string | null;
    can_logout: boolean;
};

const STATUS_COPY: Record<
    AccountStatus,
    { title: string; description: string }
> = {
    blocked: {
        title: 'Your account is blocked',
        description:
            'An administrator has blocked your account. You cannot use the platform until the restriction is lifted.',
    },
    suspended: {
        title: 'Your account is suspended',
        description:
            'An administrator has suspended your account. You cannot use the platform until the restriction is lifted.',
    },
};

export default function AccountRestricted({
    account_status,
    support_email,
    can_logout,
}: Props) {
    const copy = STATUS_COPY[account_status] ?? STATUS_COPY.blocked;

    return (
        <AuthLayout title={copy.title} description={copy.description}>
            <Head title="Account restricted" />

            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
                    <Ban className="h-8 w-8" aria-hidden />
                </div>

                <p className="text-sm text-muted-foreground">
                    If you believe this is a mistake, please contact an
                    administrator for help.
                </p>

                {support_email && (
                    <a
                        href={`mailto:${support_email}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <Mail className="h-4 w-4" aria-hidden />
                        {support_email}
                    </a>
                )}

                <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                    {can_logout && (
                        <Form {...logout.form()} className="contents">
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Log out
                                </Button>
                            )}
                        </Form>
                    )}
                    <Button variant="outline" asChild>
                        <TextLink href={home()}>Back to home</TextLink>
                    </Button>
                </div>
            </div>
        </AuthLayout>
    );
}
