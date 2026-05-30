/**
 * VacancyPreviewModal
 *
 * A self-contained slide-in job-detail drawer that:
 *  1. Fetches a single vacancy + apply-status + user CVs from /api/vacancies/:id/preview
 *  2. Renders the same side-panel UI as the jobs page drawer
 *  3. Opens an inline apply dialog so the user can apply without leaving the page
 *
 * Usage:
 *   <VacancyPreviewModal vacancyId={42} onClose={() => setId(null)} />
 */

import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vacancy {
    id: number;
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
    is_expired?: boolean;
}

interface UserCv {
    id: number;
    title: string;
    full_name: string | null;
    is_default: boolean;
}

interface PreviewData {
    vacancy: Vacancy;
    has_applied: boolean;
    user_cvs: UserCv[];
}

// ─── Label / colour maps (mirrors job-listings.tsx) ───────────────────────────

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
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
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
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function csrfToken(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

const COVER_LETTER_PLACEHOLDER = `Dear Hiring Manager,

I am excited to apply for this position and believe my experience makes me a strong candidate.

Best regards,
[Your Name]`;

// ─── Apply Dialog ─────────────────────────────────────────────────────────────

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
            onSuccess: () => setSubmitted(true),
        });
    }

    // ── Success state ─────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <>
                <div
                    className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs"
                    onClick={onClose}
                />
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
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
                        <p className="mb-8 text-sm leading-relaxed text-slate-500">
                            Your application for{' '}
                            <span className="font-semibold text-slate-700">
                                {vacancy.title}
                            </span>{' '}
                            has been submitted successfully.
                        </p>
                        <button
                            onClick={() => {
                                onSuccess();
                                onClose();
                            }}
                            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ── Dialog ────────────────────────────────────────────────────────────────
    return (
        <>
            <div
                className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-xs"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                <div
                    className="animate-dialog-in flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="border-b border-slate-100 px-8 pt-7 pb-5">
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
                                    {vacancy.title.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm leading-tight font-bold text-slate-900">
                                        {vacancy.title}
                                    </p>
                                    {vacancy.location && (
                                        <p className="text-[12px] text-slate-400">
                                            {vacancy.location}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
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
                                                className={`text-[12px] font-medium transition-colors ${isActive ? 'text-slate-800' : isDone ? 'text-emerald-600' : 'text-slate-400'}`}
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

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        {/* Step 1: Select CV */}
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
                                        <p className="mb-1 text-sm font-semibold text-slate-600">
                                            No CVs found
                                        </p>
                                        <p className="mb-5 text-[13px] text-slate-400">
                                            Create a CV before applying
                                        </p>
                                        <a
                                            href="/cv/create"
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                                        >
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
                                                    className={`flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                                >
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
                                                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5"
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
                                    </div>
                                )}
                                {errors.cv_id && (
                                    <p className="text-[12px] text-red-500">
                                        {errors.cv_id}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step 2: Cover Letter */}
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
                                {selectedCv && (
                                    <div className="flex w-fit items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                                        <svg
                                            className="h-3.5 w-3.5 text-blue-500"
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
                                    <span
                                        className={`absolute right-3 bottom-3 text-[11px] font-medium transition-colors ${data.cover_letter.length > 4500 ? 'text-red-400' : 'text-slate-300'}`}
                                    >
                                        {data.cover_letter.length}/5000
                                    </span>
                                </div>
                                {errors.cover_letter && (
                                    <p className="text-[12px] text-red-500">
                                        {errors.cover_letter}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step 3: Confirm */}
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
                                {/* Job summary */}
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
                                {selectedCv && (
                                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                                            <svg
                                                className="h-5 w-5 text-white"
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
                                                {selectedCv.title}
                                            </p>
                                        </div>
                                    </div>
                                )}
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

                    {/* Footer */}
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ onClose }: { onClose: () => void }) {
    return (
        <>
            <div
                className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-xs"
                onClick={onClose}
            />
            <div className="animate-slide-in fixed top-0 right-0 z-[110] flex h-full w-[500px] max-w-full flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="flex-1 space-y-2.5 pt-1">
                            <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-100" />
                            <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-100" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {[72, 88, 64].map((w) => (
                            <div
                                key={w}
                                className="h-7 animate-pulse rounded-full bg-slate-100"
                                style={{ width: w }}
                            />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="space-y-2 rounded-xl bg-slate-50 p-3"
                            >
                                <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
                                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {[100, 96, 88, 92, 80].map((pct, i) => (
                            <div
                                key={i}
                                className="h-3.5 animate-pulse rounded-lg bg-slate-100"
                                style={{ width: `${pct}%` }}
                            />
                        ))}
                    </div>
                    <div className="space-y-2">
                        {[100, 92, 85].map((pct, i) => (
                            <div
                                key={i}
                                className="h-3.5 animate-pulse rounded-lg bg-slate-100"
                                style={{ width: `${pct}%` }}
                            />
                        ))}
                    </div>
                </div>
                <div className="border-t border-slate-100 px-6 py-4">
                    <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
                </div>
            </div>
        </>
    );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function VacancyPreviewModal({
    vacancyId,
    onClose,
}: {
    vacancyId: number;
    onClose: () => void;
}) {
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);

    useEffect(() => {
        const ctrl = new AbortController();
        setLoading(true);
        setPreviewData(null);

        fetch(`/api/vacancies/${vacancyId}/preview`, {
            signal: ctrl.signal,
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
            },
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d: PreviewData) => {
                setPreviewData(d);
                setHasApplied(d.has_applied);
            })
            .catch(() => {
                /* show nothing on network error */
            })
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [vacancyId]);

    if (loading) return <LoadingSkeleton onClose={onClose} />;
    if (!previewData) return null;

    const { vacancy, user_cvs } = previewData;
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline
        ? daysUntil(vacancy.application_deadline)
        : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired = vacancy.is_expired ?? (deadline !== null && deadline < 0);

    return (
        <>
            <style>{`
                @keyframes slide-in  { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes dialog-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-slide-in  { animation: slide-in  0.25s cubic-bezier(0.22, 1, 0.36, 1); }
                .animate-dialog-in { animation: dialog-in 0.20s cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-xs"
                onClick={onClose}
            />

            {/* Side panel */}
            <div className="animate-slide-in fixed top-0 right-0 z-[110] flex h-full w-[500px] max-w-full flex-col bg-white shadow-2xl">
                {/* Header bar */}
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

                {/* Scrollable body */}
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {/* Title + badges */}
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
                                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${!isExpired ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
                            >
                                {!isExpired ? '● Open' : 'Closed'}
                            </span>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                label: 'Salary',
                                value: salary ?? 'Not specified',
                                urgent: false,
                            },
                            {
                                label: 'Posted',
                                value: timeAgo(vacancy.created_at),
                                urgent: false,
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
                                urgent: false,
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

                    {/* Urgency banner */}
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

                    {/* Description */}
                    <div>
                        <h3 className="mb-2 text-[12px] font-semibold tracking-widest text-slate-400 uppercase">
                            About the Role
                        </h3>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                            {vacancy.description}
                        </p>
                    </div>

                    {/* Requirements */}
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

                {/* Sticky footer */}
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
                    ) : isExpired ? (
                        <div className="flex flex-1 items-center justify-center rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-400">
                            Applications Closed
                        </div>
                    ) : (
                        <button
                            onClick={() => setApplying(true)}
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
                </div>
            </div>

            {/* Apply dialog — renders above the drawer */}
            {applying && (
                <ApplyDialog
                    vacancy={vacancy}
                    userCvs={user_cvs}
                    onClose={() => setApplying(false)}
                    onSuccess={() => {
                        setHasApplied(true);
                        setApplying(false);
                    }}
                />
            )}
        </>
    );
}
