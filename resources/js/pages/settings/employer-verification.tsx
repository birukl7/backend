import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';

type EmployerType = 'basic' | 'company' | '';

interface EmployerData {
    employer_type: EmployerType | null;
    national_id: string | null;
    company_tin_number: string | null;
    company_name: string | null;
    company_website: string | null;
    company_description: string | null;
    employer_verification_status: string | null;
    company_verification_status: string | null;
    needs_completion: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Employer verification',
        href: '/settings/employer-verification',
    },
];

export default function EmployerVerification({
    employer,
    status,
}: {
    employer: EmployerData;
    status?: string;
}) {
    const [employerType, setEmployerType] = useState<EmployerType>(
        employer.employer_type ?? '',
    );

    const verificationStatus =
        employer.employer_type === 'company'
            ? employer.company_verification_status
            : employer.employer_verification_status;

    const isPending = verificationStatus === 'pending' && !employer.needs_completion;
    const isApproved = verificationStatus === 'approved';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employer verification" />

            <h1 className="sr-only">Employer verification</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Employer verification"
                        description="Submit your National ID (FAN) and company details for review"
                    />

                    {status === 'verification-submitted' && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            Your verification details have been submitted and are pending
                            review.
                        </div>
                    )}

                    {isApproved && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            Your employer account is verified.
                        </div>
                    )}

                    {isPending && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            Your verification is under review. We will notify you once it
                            is processed.
                        </div>
                    )}

                    {verificationStatus === 'rejected' && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            Your verification was rejected. Please update your details
                            below and resubmit.
                        </div>
                    )}

                    {!isApproved && (
                        <Form
                            action="/settings/employer-verification"
                            method="patch"
                            options={{ preserveScroll: true }}
                            className="space-y-6"
                        >
                            {({ processing, recentlySuccessful, errors }) => (
                                <>
                                    <div className="space-y-3">
                                        <Label>Employer type</Label>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => setEmployerType('basic')}
                                                className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                                    employerType === 'basic'
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-slate-200 hover:border-purple-300'
                                                }`}
                                            >
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Basic Employer
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    Individual or sole proprietor
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEmployerType('company')}
                                                className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
                                                    employerType === 'company'
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-slate-200 hover:border-purple-300'
                                                }`}
                                            >
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Company
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    Registered business entity
                                                </p>
                                            </button>
                                        </div>
                                        <input
                                            type="hidden"
                                            name="employer_type"
                                            value={employerType}
                                        />
                                        <InputError message={errors.employer_type} />
                                    </div>

                                    {employerType !== '' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="national_id">
                                                National ID (FAN){' '}
                                                <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="national_id"
                                                name="national_id"
                                                required
                                                inputMode="numeric"
                                                pattern="\d{16}"
                                                minLength={16}
                                                maxLength={16}
                                                defaultValue={employer.national_id ?? ''}
                                                placeholder="16-digit FAN number"
                                            />
                                            <InputError message={errors.national_id} />
                                        </div>
                                    )}

                                    {employerType === 'company' && (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="company_tin_number">
                                                    TIN Number{' '}
                                                    <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="company_tin_number"
                                                    name="company_tin_number"
                                                    required
                                                    defaultValue={
                                                        employer.company_tin_number ?? ''
                                                    }
                                                    placeholder="Tax identification number"
                                                />
                                                <InputError
                                                    message={errors.company_tin_number}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="company_name">
                                                    Company Name{' '}
                                                    <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="company_name"
                                                    name="company_name"
                                                    required
                                                    defaultValue={
                                                        employer.company_name ?? ''
                                                    }
                                                    placeholder="Your company"
                                                />
                                                <InputError message={errors.company_name} />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="company_website">
                                                    Company Website{' '}
                                                    <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="company_website"
                                                    name="company_website"
                                                    type="url"
                                                    required
                                                    defaultValue={
                                                        employer.company_website ?? ''
                                                    }
                                                    placeholder="https://..."
                                                />
                                                <InputError
                                                    message={errors.company_website}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="company_description">
                                                    Company Description
                                                </Label>
                                                <Input
                                                    id="company_description"
                                                    name="company_description"
                                                    defaultValue={
                                                        employer.company_description ?? ''
                                                    }
                                                    placeholder="What does your company do?"
                                                />
                                                <InputError
                                                    message={errors.company_description}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={
                                                processing || employerType === ''
                                            }
                                        >
                                            {employer.needs_completion
                                                ? 'Submit for verification'
                                                : 'Resubmit for verification'}
                                        </Button>

                                        <Transition
                                            show={recentlySuccessful}
                                            enter="transition ease-in-out"
                                            enterFrom="opacity-0"
                                            leave="transition ease-in-out"
                                            leaveTo="opacity-0"
                                        >
                                            <p className="text-sm text-neutral-600">
                                                Saved
                                            </p>
                                        </Transition>
                                    </div>
                                </>
                            )}
                        </Form>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
