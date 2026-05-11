import { usePage, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vacancy {
    id: number;
    user_id: number;
    title: string;
    description: string;
    requirements: string | null;
    location: string | null;
    salary_min: string | null;
    salary_max: string | null;
    employment_type:
        | 'full_time'
        | 'part_time'
        | 'contract'
        | 'temporary'
        | 'internship';
    status: 'open' | 'closed';
    work_type: 'remote' | 'on_site' | 'hybrid';
    application_deadline: string | null;
    created_at: string;
    updated_at: string;
}

interface UserCv {
    id: number;
    title: string;
    full_name: string | null;
    is_default: boolean;
}

interface AuthUser {
    id: number;
    name: string;
    email: string;
    profile_photo_url?: string;
}

interface Props {
    vacancies: Vacancy[];
    applied_ids?: number[];
    user_cvs?: UserCv[];
    ai_matches?: Record<number, number>; // vacancy_id -> score (0.0 – 1.0)
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<Vacancy['employment_type'], string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    temporary: 'Temporary',
    internship: 'Internship',
};
const WORK_TYPE_LABELS: Record<Vacancy['work_type'], string> = {
    remote: 'Remote',
    on_site: 'On-site',
    hybrid: 'Hybrid',
};
const WORK_TYPE_COLORS: Record<Vacancy['work_type'], string> = {
    remote: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_site: 'bg-slate-100 text-slate-600 border-slate-200',
    hybrid: 'bg-violet-50 text-violet-700 border-violet-200',
};
const EMPLOYMENT_COLORS: Record<Vacancy['employment_type'], string> = {
    full_time: 'bg-blue-50 text-blue-700 border-blue-200',
    part_time: 'bg-amber-50 text-amber-700 border-amber-200',
    contract: 'bg-orange-50 text-orange-700 border-orange-200',
    temporary: 'bg-pink-50 text-pink-700 border-pink-200',
    internship: 'bg-teal-50 text-teal-700 border-teal-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(min: string | null, max: string | null): string | null {
    if (!min && !max) return null;
    const fmt = (v: string) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ETB',
            maximumFractionDigits: 0,
        }).format(parseFloat(v));
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ─── Apply Dialog ─────────────────────────────────────────────────────────────

const COVER_LETTER_PLACEHOLDER = `Dear Hiring Team,

I am excited to apply for this role. I believe my background in [relevant area] makes me a strong candidate...

[Tell them why you're genuinely interested and what unique value you bring]

Looking forward to the opportunity to connect.

Best regards,
[Your Name]`;

type ApplyStep = 'select-cv' | 'cover-letter' | 'confirm';

function ApplyDialog({
    vacancy,
    userCvs,
    onClose,
    onSuccess,
}: {
    vacancy: Vacancy;
    userCvs: UserCv[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const defaultCv = userCvs.find((c) => c.is_default) ?? userCvs[0] ?? null;
    const [step, setStep] = useState<ApplyStep>(
        userCvs.length === 0 ? 'cover-letter' : 'select-cv',
    );
    const [submitted, setSubmitted] = useState(false);

    const { data, setData, post, processing, errors } = useForm<{
        vacancy_id: number;
        cv_id: number | null;
        cover_letter: string;
    }>({
        vacancy_id: vacancy.id,
        cv_id: defaultCv?.id ?? null,
        cover_letter: '',
    });

    const selectedCv = userCvs.find((c) => c.id === data.cv_id) ?? null;

    const STEPS: ApplyStep[] =
        userCvs.length > 0
            ? ['select-cv', 'cover-letter', 'confirm']
            : ['cover-letter', 'confirm'];

    const stepIndex = STEPS.indexOf(step);
    const totalSteps = STEPS.length;

    function goNext() {
        const next = STEPS[stepIndex + 1];
        if (next) setStep(next);
    }
    function goBack() {
        const prev = STEPS[stepIndex - 1];
        if (prev) setStep(prev);
    }

    function submit() {
        post('/applications', {
            preserveScroll: true,
            onSuccess: () => {
                setSubmitted(true);
            },
        });
    }

    // ── Success screen ────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <>
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[4px]"
                    onClick={onClose}
                />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="animate-dialog-in w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-2xl">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50">
                            <svg
                                className="h-10 w-10 text-emerald-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-slate-900">
                            Application Sent!
                        </h2>
                        <p className="mb-2 text-sm leading-relaxed text-slate-500">
                            Your application for{' '}
                            <span className="font-semibold text-slate-700">
                                {vacancy.title}
                            </span>{' '}
                            has been submitted.
                        </p>
                        <p className="mb-8 text-xs text-slate-400">
                            The employer will review your profile and reach out
                            if there's a match.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.visit('/my-applications')}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                My Applications
                            </button>
                            <button
                                onClick={() => {
                                    onSuccess();
                                    onClose();
                                }}
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                                Browse More Jobs
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[4px]"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="animate-dialog-in flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="border-b border-slate-100 px-8 pt-7 pb-5">
                        <div className="mb-5 flex items-start justify-between">
                            <div className="flex items-center gap-3.5">
                                {/* Vacancy avatar */}
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-base font-bold text-white shadow-sm">
                                    {vacancy.title.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-base leading-tight font-bold text-slate-900">
                                        {vacancy.title}
                                    </h2>
                                    {vacancy.location && (
                                        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                                            <svg
                                                className="h-3 w-3"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            {vacancy.location}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                >
                                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                                </svg>
                            </button>
                        </div>

                        {/* Step progress */}
                        <div className="flex items-center gap-2">
                            {STEPS.map((s, i) => {
                                const label =
                                    s === 'select-cv'
                                        ? 'Resume'
                                        : s === 'cover-letter'
                                          ? 'Cover Letter'
                                          : 'Review';
                                const isActive = i === stepIndex;
                                const isDone = i < stepIndex;
                                return (
                                    <div
                                        key={s}
                                        className="flex flex-1 items-center gap-2"
                                    >
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <div
                                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                            >
                                                {isDone ? (
                                                    <svg
                                                        className="h-3 w-3"
                                                        viewBox="0 0 12 12"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            d="M2 6l3 3 5-5"
                                                        />
                                                    </svg>
                                                ) : (
                                                    i + 1
                                                )}
                                            </div>
                                            <span
                                                className={`truncate text-[12px] font-medium transition-colors ${isActive ? 'text-slate-800' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}
                                            >
                                                {label}
                                            </span>
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div
                                                className={`h-px flex-1 rounded-full transition-colors ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Body ───────────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        {/* STEP: Select CV */}
                        {step === 'select-cv' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-0.5 text-[15px] font-bold text-slate-900">
                                        Choose your resume
                                    </h3>
                                    <p className="text-[13px] text-slate-400">
                                        Select which CV to send with your
                                        application
                                    </p>
                                </div>

                                {userCvs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                                            <svg
                                                className="h-7 w-7 text-slate-300"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                />
                                            </svg>
                                        </div>
                                        <p className="mb-1 text-sm font-semibold text-slate-600">
                                            No CVs found
                                        </p>
                                        <p className="mb-5 text-[13px] text-slate-400">
                                            You need to create a CV before
                                            applying
                                        </p>
                                        <a
                                            href="/cv"
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                                        >
                                            <svg
                                                className="h-4 w-4"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                            >
                                                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                                            </svg>
                                            Create a CV
                                        </a>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {userCvs.map((cv) => {
                                            const isSelected =
                                                data.cv_id === cv.id;
                                            return (
                                                <button
                                                    key={cv.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setData('cv_id', cv.id)
                                                    }
                                                    className={`flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                                                        isSelected
                                                            ? 'border-blue-500 bg-blue-50/60'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    {/* CV icon */}
                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                    >
                                                        <svg
                                                            className="h-5 w-5"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p
                                                            className={`text-[14px] leading-tight font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}
                                                        >
                                                            {cv.title}
                                                        </p>
                                                        {cv.full_name && (
                                                            <p className="mt-0.5 text-[12px] text-slate-400">
                                                                {cv.full_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {cv.is_default && (
                                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                                                                DEFAULT
                                                            </span>
                                                        )}
                                                        <div
                                                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}
                                                        >
                                                            {isSelected && (
                                                                <svg
                                                                    className="h-3 w-3 text-white"
                                                                    viewBox="0 0 12 12"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2.5"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        d="M2 6l3 3 5-5"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        <a
                                            href="/cv"
                                            className="group flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-3 transition-all hover:border-blue-300 hover:bg-blue-50/40"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-blue-100">
                                                <svg
                                                    className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-500"
                                                    viewBox="0 0 16 16"
                                                    fill="currentColor"
                                                >
                                                    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-[13px] font-medium text-slate-500 transition-colors group-hover:text-blue-600">
                                                Create a new CV
                                            </span>
                                        </a>
                                    </div>
                                )}

                                {errors.cv_id && (
                                    <p className="text-[12px] text-red-500">
                                        {errors.cv_id}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* STEP: Cover Letter */}
                        {step === 'cover-letter' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-0.5 text-[15px] font-bold text-slate-900">
                                        Write your cover letter
                                    </h3>
                                    <p className="text-[13px] text-slate-400">
                                        Optional but strongly recommended — this
                                        is your chance to stand out.
                                    </p>
                                </div>

                                {/* Selected CV chip */}
                                {selectedCv && (
                                    <div className="flex w-fit items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                                        <svg
                                            className="h-3.5 w-3.5 shrink-0 text-blue-500"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5"
                                            />
                                        </svg>
                                        <span className="text-[12px] font-semibold text-blue-700">
                                            {selectedCv.title}
                                        </span>
                                    </div>
                                )}

                                {/* Textarea */}
                                <div className="relative">
                                    <textarea
                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 transition-all outline-none placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
                                        rows={12}
                                        placeholder={COVER_LETTER_PLACEHOLDER}
                                        value={data.cover_letter}
                                        onChange={(e) =>
                                            setData(
                                                'cover_letter',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                        <span
                                            className={`text-[11px] font-medium transition-colors ${data.cover_letter.length > 4500 ? 'text-red-400' : 'text-slate-300'}`}
                                        >
                                            {data.cover_letter.length}/5000
                                        </span>
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="space-y-1.5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3.5">
                                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-amber-700">
                                        <svg
                                            className="h-3.5 w-3.5"
                                            viewBox="0 0 16 16"
                                            fill="currentColor"
                                        >
                                            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z" />
                                        </svg>
                                        Tips for a great cover letter
                                    </p>
                                    {[
                                        'Mention the specific role and what drew you to it',
                                        'Highlight 1-2 concrete achievements relevant to the job',
                                        "Show you've researched the company",
                                    ].map((tip) => (
                                        <p
                                            key={tip}
                                            className="flex items-start gap-1.5 pl-1 text-[12px] text-amber-600"
                                        >
                                            <span className="mt-0.5 shrink-0">
                                                ·
                                            </span>{' '}
                                            {tip}
                                        </p>
                                    ))}
                                </div>

                                {errors.cover_letter && (
                                    <p className="text-[12px] text-red-500">
                                        {errors.cover_letter}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* STEP: Confirm / Review */}
                        {step === 'confirm' && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="mb-0.5 text-[15px] font-bold text-slate-900">
                                        Review your application
                                    </h3>
                                    <p className="text-[13px] text-slate-400">
                                        Everything look good? Hit submit to
                                        send.
                                    </p>
                                </div>

                                {/* Job summary card */}
                                <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
                                        {vacancy.title
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-slate-900">
                                            {vacancy.title}
                                        </p>
                                        {vacancy.location && (
                                            <p className="mt-0.5 text-[12px] text-slate-400">
                                                📍 {vacancy.location}
                                            </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${WORK_TYPE_COLORS[vacancy.work_type]}`}
                                            >
                                                {
                                                    WORK_TYPE_LABELS[
                                                        vacancy.work_type
                                                    ]
                                                }
                                            </span>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}
                                            >
                                                {
                                                    EMPLOYMENT_LABELS[
                                                        vacancy.employment_type
                                                    ]
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Resume used */}
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                                        <svg
                                            className="h-4.5 h-5 w-4.5 w-5 text-white"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                            Resume
                                        </p>
                                        <p className="text-[13px] font-semibold text-slate-800">
                                            {selectedCv?.title ??
                                                'None selected'}
                                        </p>
                                    </div>
                                </div>

                                {/* Cover letter preview */}
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                        Cover Letter
                                    </p>
                                    {data.cover_letter.trim() ? (
                                        <p className="line-clamp-5 text-[13px] leading-relaxed whitespace-pre-line text-slate-600">
                                            {data.cover_letter}
                                        </p>
                                    ) : (
                                        <p className="text-[13px] text-slate-300 italic">
                                            No cover letter — applying without
                                            one.
                                        </p>
                                    )}
                                </div>

                                {(errors as Record<string, string>).apply && (
                                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                                        {
                                            (errors as Record<string, string>)
                                                .apply
                                        }
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ─────────────────────────────────────────────── */}
                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-8 py-5">
                        <button
                            onClick={stepIndex > 0 ? goBack : onClose}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            {stepIndex > 0 ? (
                                <>
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Back
                                </>
                            ) : (
                                'Cancel'
                            )}
                        </button>

                        <div className="flex items-center gap-3">
                            {/* Step dots */}
                            <div className="flex gap-1.5">
                                {STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-blue-500' : i < stepIndex ? 'w-1.5 bg-emerald-400' : 'w-1.5 bg-slate-200'}`}
                                    />
                                ))}
                            </div>

                            {step !== 'confirm' ? (
                                <button
                                    onClick={goNext}
                                    disabled={
                                        step === 'select-cv' &&
                                        data.cv_id === null
                                    }
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Continue
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M6.22 3.22a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06-1.06L9.44 7.5 6.22 4.28a.75.75 0 010-1.06z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={submit}
                                    disabled={processing || data.cv_id === null}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v8H4z"
                                                />
                                            </svg>
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            Submit Application
                                            <svg
                                                className="h-3.5 w-3.5"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                            >
                                                <path d="M1.5 2.5l13 5.5-13 5.5V9l9-1-9-1V2.5z" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Profile Sidebar ─────────────────────────────────────────────────────────

function ProfileSidebar({ user }: { user: AuthUser }) {
    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <aside className="w-60 shrink-0 space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="h-12 bg-gradient-to-r from-blue-500 to-blue-600" />
                <div className="px-4 pb-4">
                    <div className="relative -mt-6 mb-3">
                        {user.profile_photo_url ? (
                            <img
                                src={user.profile_photo_url}
                                alt={user.name}
                                className="h-12 w-12 rounded-full border-[3px] border-white object-cover shadow"
                            />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-blue-100 text-sm font-bold text-blue-700 shadow">
                                {initials}
                            </div>
                        )}
                        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                    </div>
                    <h2 className="text-[14px] leading-tight font-semibold text-slate-900">
                        {user.name}
                    </h2>
                    <p className="mt-0.5 truncate text-[12px] text-slate-400">
                        {user.email}
                    </p>
                    <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="cursor-pointer text-[11px] text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-700">
                                Complete your profile
                            </span>
                            <span className="text-[11px] font-bold text-blue-600">
                                100%
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-full rounded-full bg-blue-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                {[
                    { label: 'Applied', value: '12' },
                    { label: 'Saved', value: '5' },
                    { label: 'Interviews', value: '2' },
                    { label: 'Offers', value: '1' },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl bg-slate-50 py-2 text-center"
                    >
                        <p className="text-lg font-bold text-slate-800">
                            {s.value}
                        </p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {[
                    {
                        icon: (
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 9.5a2 2 0 100-4 2 2 0 000 4zM13.5 8a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"
                                />
                            </svg>
                        ),
                        label: 'Manage Profile',
                        sub: 'Update your info',
                        href: '/profile',
                        color: 'text-blue-600 bg-blue-50',
                    },
                    {
                        icon: (
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 1.5l1.75 3.5 3.75.5-2.75 2.75.75 3.75L8 10l-3.5 2 .75-3.75L2.5 5.5l3.75-.5L8 1.5z"
                                />
                            </svg>
                        ),
                        label: 'Skill Score',
                        sub: 'View your ratings',
                        href: '/skills',
                        color: 'text-amber-600 bg-amber-50',
                    },
                    {
                        icon: (
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M1.5 2.5h13v9h-13zM5.5 11.5v2M10.5 11.5v2M3.5 13.5h9"
                                />
                            </svg>
                        ),
                        label: 'Take a Quiz',
                        sub: 'Earn certifications',
                        href: '/quiz',
                        color: 'text-emerald-600 bg-emerald-50',
                    },
                    {
                        icon: (
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2 12h12M2 8h12M2 4h8"
                                />
                            </svg>
                        ),
                        label: 'My Applications',
                        sub: 'Track your progress',
                        href: '/my-applications',
                        color: 'text-violet-600 bg-violet-50',
                    },
                ].map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}
                        >
                            {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-tight font-medium text-slate-800">
                                {item.label}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                {item.sub}
                            </p>
                        </div>
                        <svg
                            className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-400"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </a>
                ))}
            </div>
        </aside>
    );
}

// ─── Job Detail Drawer ────────────────────────────────────────────────────────

function JobDrawer({
    vacancy,
    hasApplied,
    onClose,
    onApply,
}: {
    vacancy: Vacancy;
    hasApplied: boolean;
    onClose: () => void;
    onApply: () => void;
}) {
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline
        ? daysUntil(vacancy.application_deadline)
        : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div className="animate-slide-in fixed top-0 right-0 z-50 flex h-full w-[500px] max-w-full flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <span className="text-[13px] font-medium text-slate-400">
                        Job Details
                    </span>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <div>
                        <div className="mb-4 flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 text-base font-bold text-blue-700">
                                {vacancy.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl leading-snug font-bold text-slate-900">
                                    {vacancy.title}
                                </h2>
                                {vacancy.location && (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                                        <svg
                                            className="h-3.5 w-3.5"
                                            viewBox="0 0 16 16"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        {vacancy.location}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span
                                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${WORK_TYPE_COLORS[vacancy.work_type]}`}
                            >
                                {WORK_TYPE_LABELS[vacancy.work_type]}
                            </span>
                            <span
                                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}
                            >
                                {EMPLOYMENT_LABELS[vacancy.employment_type]}
                            </span>
                            <span
                                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${vacancy.status === 'open' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
                            >
                                {vacancy.status === 'open'
                                    ? '● Open'
                                    : 'Closed'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                label: 'Salary',
                                value: salary ?? 'Not specified',
                            },
                            {
                                label: 'Posted',
                                value: timeAgo(vacancy.created_at),
                            },
                            {
                                label: 'Deadline',
                                value: vacancy.application_deadline
                                    ? new Date(
                                          vacancy.application_deadline,
                                      ).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                      })
                                    : 'No deadline',
                                urgent: isUrgent,
                            },
                            {
                                label: 'Employment',
                                value: EMPLOYMENT_LABELS[
                                    vacancy.employment_type
                                ],
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                            >
                                <p className="mb-1 text-[11px] tracking-wide text-slate-400 uppercase">
                                    {item.label}
                                </p>
                                <p
                                    className={`text-[14px] font-semibold ${item.urgent ? 'text-red-500' : 'text-slate-800'}`}
                                >
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {isUrgent && deadline !== null && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                            <svg
                                className="h-4 w-4 shrink-0 text-red-500"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3.25a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <p className="text-[13px] font-medium text-red-600">
                                {deadline === 0
                                    ? 'Closes today — apply now!'
                                    : `Only ${deadline} day${deadline === 1 ? '' : 's'} left to apply`}
                            </p>
                        </div>
                    )}

                    <div>
                        <h3 className="mb-2 text-[12px] font-semibold tracking-widest text-slate-400 uppercase">
                            About the Role
                        </h3>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                            {vacancy.description}
                        </p>
                    </div>

                    {vacancy.requirements && (
                        <div>
                            <h3 className="mb-2 text-[12px] font-semibold tracking-widest text-slate-400 uppercase">
                                Requirements
                            </h3>
                            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                                {vacancy.requirements}
                            </p>
                        </div>
                    )}
                </div>

                {/* Sticky footer with Apply button */}
                <div className="flex gap-3 border-t border-slate-100 bg-white px-6 py-4">
                    {hasApplied ? (
                        <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700">
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" d="M2 8l4 4 8-8" />
                            </svg>
                            Already Applied
                        </div>
                    ) : vacancy.status !== 'open' ? (
                        <div className="flex flex-1 items-center justify-center rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-400">
                            Applications Closed
                        </div>
                    ) : (
                        <button
                            onClick={onApply}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                            Apply Now
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M1.5 2.5l13 5.5-13 5.5V9l9-1-9-1V2.5z" />
                            </svg>
                        </button>
                    )}
                    <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.5 2.5h11v12l-5.5-3-5.5 3z"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
    vacancy,
    hasApplied,
    onClick,
    matchScore,
}: {
    vacancy: Vacancy;
    hasApplied: boolean;
    onClick: () => void;
    matchScore?: number;
}) {
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline
        ? daysUntil(vacancy.application_deadline)
        : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired = deadline !== null && deadline < 0;

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-blue-300 hover:shadow-md"
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-500">
                        {vacancy.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-[15px] leading-snug font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                            {vacancy.title}
                        </h3>
                        {vacancy.location && (
                            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                                <svg
                                    className="h-3 w-3"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {vacancy.location}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {matchScore !== undefined && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600">
                            <svg
                                className="h-3 w-3"
                                viewBox="0 0 12 12"
                                fill="currentColor"
                            >
                                <path d="M6 1l1.24 2.52L10 4.14 7.98 6.1l.47 2.73L6 7.4 3.55 8.83 4.02 6.1 2 4.14l2.76-.62L6 1z" />
                            </svg>
                            {Math.round(matchScore * 100)}% match
                        </span>
                    )}
                    {hasApplied && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            <svg
                                className="h-3 w-3"
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path strokeLinecap="round" d="M2 6l3 3 5-5" />
                            </svg>
                            Applied
                        </span>
                    )}
                    {vacancy.status === 'open' && !isExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Open
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                            Closed
                        </span>
                    )}
                </div>
            </div>

            <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                {vacancy.description}
            </p>

            <div className="mb-4 flex flex-wrap gap-1.5">
                <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${WORK_TYPE_COLORS[vacancy.work_type]}`}
                >
                    {WORK_TYPE_LABELS[vacancy.work_type]}
                </span>
                <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}
                >
                    {EMPLOYMENT_LABELS[vacancy.employment_type]}
                </span>
                {vacancy.requirements && (
                    <span className="max-w-[160px] truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                        {vacancy.requirements}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div>
                    {salary ? (
                        <span className="text-[13px] font-semibold text-slate-800">
                            {salary}
                        </span>
                    ) : (
                        <span className="text-[13px] text-slate-400">
                            Salary not listed
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isUrgent && (
                        <span className="text-[11px] font-medium text-red-500">
                            {deadline === 0
                                ? 'Closes today'
                                : `${deadline}d left`}
                        </span>
                    )}
                    <span className="text-[12px] text-slate-400">
                        {timeAgo(vacancy.created_at)}
                    </span>
                    <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        View →
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FilterWorkType = 'all' | Vacancy['work_type'];
type FilterEmployment = 'all' | Vacancy['employment_type'];

export default function JobListings({
    vacancies,
    applied_ids = [],
    user_cvs = [],
    ai_matches = {},
}: Props) {
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth.user;

    const [search, setSearch] = useState('');
    const [workType, setWorkType] = useState<FilterWorkType>('all');
    const [employment, setEmployment] = useState<FilterEmployment>('all');
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [selected, setSelected] = useState<Vacancy | null>(null);
    const [applying, setApplying] = useState<Vacancy | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'recommended'>('all');

    // Track applied IDs locally so the UI updates after submission without a full page reload
    const [localAppliedIds, setLocalAppliedIds] =
        useState<number[]>(applied_ids);

    const filtered = vacancies.filter((v) => {
        if (showOpenOnly && v.status !== 'open') return false;
        if (workType !== 'all' && v.work_type !== workType) return false;
        if (employment !== 'all' && v.employment_type !== employment)
            return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                v.title.toLowerCase().includes(q) ||
                v.description.toLowerCase().includes(q) ||
                (v.location ?? '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const hasAiMatches = Object.keys(ai_matches).length > 0;

    // AI-ranked list: vacancies with score >= 30%, sorted best-first, respects active filters
    const aiRecommended = hasAiMatches
        ? vacancies
              .filter((v) => {
                  if ((ai_matches[v.id] ?? 0) < 0.3) return false;
                  if (showOpenOnly && v.status !== 'open') return false;
                  if (workType !== 'all' && v.work_type !== workType)
                      return false;
                  if (employment !== 'all' && v.employment_type !== employment)
                      return false;
                  if (search.trim()) {
                      const q = search.toLowerCase();
                      return (
                          v.title.toLowerCase().includes(q) ||
                          v.description.toLowerCase().includes(q) ||
                          (v.location ?? '').toLowerCase().includes(q)
                      );
                  }
                  return true;
              })
              .sort((a, b) => (ai_matches[b.id] ?? 0) - (ai_matches[a.id] ?? 0))
        : [];

    const displayList = activeTab === 'recommended' ? aiRecommended : filtered;

    function openApply(vacancy: Vacancy) {
        setSelected(null); // close drawer
        setApplying(vacancy);
    }

    function onApplySuccess() {
        if (applying) setLocalAppliedIds((prev) => [...prev, applying.id]);
        setApplying(null);
    }

    return (
        <>
            <style>{`
                @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes dialog-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
                .animate-dialog-in { animation: dialog-in 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>

            <div className="flex min-h-0 w-full gap-5 px-6 py-6">
                <ProfileSidebar user={user} />

                <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Job Board
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-400">
                                {activeTab === 'recommended'
                                    ? `${aiRecommended.length} AI ${aiRecommended.length === 1 ? 'recommendation' : 'recommendations'} for you`
                                    : `${filtered.length} ${filtered.length === 1 ? 'position' : 'positions'} available`}
                            </p>
                        </div>
                        {hasAiMatches && (
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                                        activeTab === 'all'
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    All Jobs
                                </button>
                                <button
                                    onClick={() => setActiveTab('recommended')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                                        activeTab === 'recommended'
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                    >
                                        <path d="M8 1.333l1.654 3.36 3.679.533-2.666 2.6.633 3.667L8 9.546l-3.3 1.947.633-3.667-2.666-2.6 3.679-.533L8 1.333z" />
                                    </svg>
                                    AI Picks
                                    {aiRecommended.length > 0 && (
                                        <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                activeTab === 'recommended'
                                                    ? 'bg-violet-400 text-white'
                                                    : 'bg-violet-100 text-violet-600'
                                            }`}
                                        >
                                            {aiRecommended.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* No-CV prompt: nudge users to create a CV to unlock AI picks */}
                    {user_cvs.length === 0 && (
                        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                                <svg
                                    className="h-5 w-5 text-violet-600"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-violet-900">
                                    Unlock AI Job Recommendations
                                </p>
                                <p className="mt-0.5 text-[12px] text-violet-600">
                                    Create a CV so our AI can match your skills
                                    to the best open positions
                                </p>
                            </div>
                            <a
                                href="/cv"
                                className="shrink-0 rounded-lg bg-violet-100 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap text-violet-700 transition-colors hover:bg-violet-200"
                            >
                                Create CV →
                            </a>
                        </div>
                    )}

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="relative">
                            <svg
                                className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path
                                    d="M5.5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 5.5a4.5 4.5 0 117.91 2.912l2.718 2.719a.75.75 0 01-1.06 1.06L7.85 9.473A4.5 4.5 0 011 5.5z"
                                    clipRule="evenodd"
                                    fillRule="evenodd"
                                />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by title, skill, or location..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-9 text-sm transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={workType}
                                onChange={(e) =>
                                    setWorkType(
                                        e.target.value as FilterWorkType,
                                    )
                                }
                                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="all">All work types</option>
                                <option value="remote">Remote</option>
                                <option value="hybrid">Hybrid</option>
                                <option value="on_site">On-site</option>
                            </select>
                            <select
                                value={employment}
                                onChange={(e) =>
                                    setEmployment(
                                        e.target.value as FilterEmployment,
                                    )
                                }
                                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="all">All job types</option>
                                <option value="full_time">Full-time</option>
                                <option value="part_time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="temporary">Temporary</option>
                                <option value="internship">Internship</option>
                            </select>
                            <label className="ml-auto flex cursor-pointer items-center gap-2">
                                <div
                                    onClick={() =>
                                        setShowOpenOnly(!showOpenOnly)
                                    }
                                    className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${showOpenOnly ? 'bg-blue-500' : 'bg-slate-200'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showOpenOnly ? 'translate-x-4' : ''}`}
                                    />
                                </div>
                                <span className="text-[13px] text-slate-600 select-none">
                                    Open only
                                </span>
                            </label>
                        </div>
                    </div>

                    {displayList.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            {activeTab === 'recommended' ? (
                                <>
                                    <svg
                                        className="mx-auto mb-3 h-10 w-10 opacity-40"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M11.48 3.499a.562.562 0 011.04 0l2.125 4.306 4.745.689a.562.562 0 01.311.958l-3.435 3.346.811 4.727a.562.562 0 01-.816.594L12 15.547l-4.244 2.572a.562.562 0 01-.816-.594l.811-4.727L4.316 9.452a.562.562 0 01.311-.958l4.745-.69 2.108-4.305z"
                                        />
                                    </svg>
                                    <p className="font-medium text-slate-500">
                                        No strong matches found
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Complete your CV with more skills and
                                        experience for better recommendations
                                    </p>
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="mx-auto mb-3 h-10 w-10 opacity-40"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                        />
                                    </svg>
                                    <p className="font-medium text-slate-500">
                                        No jobs match your filters
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Try adjusting your search or clearing
                                        some filters
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {displayList.map((v) => (
                                <JobCard
                                    key={v.id}
                                    vacancy={v}
                                    hasApplied={localAppliedIds.includes(v.id)}
                                    onClick={() => setSelected(v)}
                                    matchScore={ai_matches[v.id]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Job detail drawer */}
            {selected && (
                <JobDrawer
                    vacancy={selected}
                    hasApplied={localAppliedIds.includes(selected.id)}
                    onClose={() => setSelected(null)}
                    onApply={() => openApply(selected)}
                />
            )}

            {/* Apply dialog */}
            {applying && (
                <ApplyDialog
                    vacancy={applying}
                    userCvs={user_cvs}
                    onClose={() => setApplying(null)}
                    onSuccess={onApplySuccess}
                />
            )}
        </>
    );
}
