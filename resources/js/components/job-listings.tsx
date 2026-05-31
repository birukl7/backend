import { usePage, useForm, router, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ScreeningChat from '@/components/screening-chat';
import { DashboardWelcome } from '@/components/dashboard-welcome';
import { VerificationBadges, isEmployerVerified } from '@/components/verification-badges';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployerStats {
    employer_id: number;
    employer_name: string | null;
    total_jobs: number;
    total_applications: number;
    total_hires: number;
    hires_last_30_days: number;
    hire_rate: number;
    member_since: string | null;
}

interface Vacancy {
    id: number;
    user_id: number;
    title: string;
    description: string;
    requirements: string | null;
    tags?: string[] | null;
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
    screening_required?: boolean;
    is_expired?: boolean;
    employer_stats?: EmployerStats | null;
    employer?: {
        id: number;
        name: string;
        company_name: string | null;
        company_website: string | null;
        employer_type?: 'basic' | 'company' | null;
        employer_verification_status?: string | null;
        company_verification_status?: string | null;
    } | null;
    match_score?: number | null;
}

/** Resolve AI match score from vacancy prop or ai_matches map (handles string/number keys). */
function lookupMatchScore(
    ai_matches: Record<string | number, number>,
    vacancy: Vacancy,
): number | undefined {
    if (vacancy.match_score != null && !Number.isNaN(vacancy.match_score)) {
        return vacancy.match_score;
    }

    const id = vacancy.id;

    if (ai_matches[id] !== undefined) {
        return ai_matches[id];
    }

    const asString = String(id);

    if (ai_matches[asString] !== undefined) {
        return ai_matches[asString];
    }

    return undefined;
}

interface UserCv {
    id: number;
    title: string;
    full_name: string | null;
    is_default: boolean;
    source?: 'builder' | 'upload';
    original_filename?: string | null;
}

interface AuthUser {
    id: number;
    name: string;
    email: string;
    profile_photo_url?: string;
}

interface SidebarStats {
    applied: number;
    interviews: number;
    skills_earned: number;
    cvs_count: number;
    saved?: number;
}

interface Props {
    vacancies: Vacancy[];
    applied_ids?: number[];
    saved_ids?: number[];
    user_cvs?: UserCv[];
    ai_matches?: Record<number, number>; // vacancy_id -> score (0.0 – 1.0)
    ai_matching_hint?: string | null;
    ai_matching_debug?: Record<string, unknown> | null;
    sidebar_stats?: SidebarStats | null;
    profile_completion?: number; // 0–100
    is_authenticated?: boolean;
    pageMode?: 'board' | 'saved';
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

function salaryMinValue(min: string | null, max: string | null): number | null {
    if (min) return parseFloat(min);
    if (max) return parseFloat(max);
    return null;
}

function salaryMaxValue(min: string | null, max: string | null): number | null {
    if (max) return parseFloat(max);
    if (min) return parseFloat(min);
    return null;
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
                                            Create or upload a CV before applying
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
                                                        {cv.source === 'upload' && cv.original_filename && (
                                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                                                {cv.original_filename}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {cv.source === 'upload' && (
                                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                                UPLOAD
                                                            </span>
                                                        )}
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

function ProfileSidebar({
    user,
    stats,
    profileCompletion,
}: {
    user: AuthUser;
    stats?: SidebarStats;
    profileCompletion: number;
}) {
    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const statCards = [
        {
            label: 'Applied',
            value: stats?.applied ?? 0,
            color: 'text-blue-700',
            bg: 'bg-blue-50',
            href: '/my-applications',
        },
        {
            label: 'Interviews',
            value: stats?.interviews ?? 0,
            color: 'text-violet-700',
            bg: 'bg-violet-50',
            href: '/my-interviews',
        },
        {
            label: 'Skills',
            value: stats?.skills_earned ?? 0,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
            href: '/quiz',
        },
        {
            label: 'CVs',
            value: stats?.cvs_count ?? 0,
            color: 'text-amber-700',
            bg: 'bg-amber-50',
            href: '/cv',
        },
    ];

    const completionColor =
        profileCompletion >= 100 ? 'bg-emerald-500' : 'bg-blue-500';

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
                            <Link
                                href="/cv"
                                className="text-[11px] text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-700"
                            >
                                {profileCompletion < 100
                                    ? 'Complete your profile'
                                    : 'Profile complete'}
                            </Link>
                            <span
                                className={`text-[11px] font-bold ${profileCompletion >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}
                            >
                                {profileCompletion}%
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${completionColor}`}
                                style={{ width: `${profileCompletion}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                {statCards.map((s) => (
                    <Link
                        key={s.label}
                        href={s.href}
                        className={`rounded-xl py-2 text-center transition-opacity hover:opacity-80 ${s.bg}`}
                    >
                        <p className={`text-lg font-bold ${s.color}`}>
                            {s.value}
                        </p>
                        <p className="text-[10px] text-slate-500">{s.label}</p>
                    </Link>
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
                        href: '/settings/profile',
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
                                    d="M2.5 2.5h11v12l-5.5-3-5.5 3z"
                                />
                            </svg>
                        ),
                        label: 'Saved Jobs',
                        sub: 'Roles you bookmarked',
                        href: '/saved-jobs',
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
                    <Link
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
                    </Link>
                ))}
            </div>
        </aside>
    );
}

// ─── Tag list ─────────────────────────────────────────────────────────────────

function TagList({
    tags,
    max,
    onToggle,
    active = [],
}: {
    tags: string[];
    max?: number;
    onToggle?: (tag: string) => void;
    active?: string[];
}) {
    const shown = max ? tags.slice(0, max) : tags;
    const extra = max && tags.length > max ? tags.length - max : 0;

    return (
        <div className="flex flex-wrap gap-1.5">
            {shown.map((tag) => {
                const isActive = active.includes(tag);
                return (
                    <span
                        key={tag}
                        onClick={
                            onToggle
                                ? (e) => {
                                      e.stopPropagation();
                                      onToggle(tag);
                                  }
                                : undefined
                        }
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                            onToggle ? 'cursor-pointer' : ''
                        } ${
                            isActive
                                ? 'border-indigo-300 bg-indigo-600 text-white'
                                : 'border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}
                    >
                        #{tag}
                    </span>
                );
            })}
            {extra > 0 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                    +{extra}
                </span>
            )}
        </div>
    );
}

// ─── Employer hiring history ────────────────────────────────────────────────

function EmployerHistoryCard({ stats }: { stats: EmployerStats }) {
    const metrics = [
        {
            label: 'Total hires',
            value: stats.total_hires,
            color: 'text-emerald-600',
        },
        {
            label: 'Jobs posted',
            value: stats.total_jobs,
            color: 'text-blue-600',
        },
        {
            label: 'Hire rate',
            value: `${stats.hire_rate}%`,
            color: 'text-violet-600',
        },
    ];

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </span>
                    <h3 className="text-[13px] font-bold text-slate-800">
                        Employer hiring history
                    </h3>
                </div>
                {stats.employer_name && (
                    <span className="max-w-[140px] truncate text-[12px] font-medium text-slate-400">
                        {stats.employer_name}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {metrics.map((m) => (
                    <div
                        key={m.label}
                        className="rounded-xl border border-slate-100 bg-white px-2 py-2.5 text-center"
                    >
                        <p className={`text-lg font-bold ${m.color}`}>
                            {m.value}
                        </p>
                        <p className="text-[10px] tracking-wide text-slate-400 uppercase">
                            {m.label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                    {stats.total_hires > 0
                        ? `${stats.hires_last_30_days} hired in the last 30 days`
                        : 'No hires recorded yet'}
                </span>
                {stats.member_since && (
                    <span>
                        Hiring since{' '}
                        {new Date(stats.member_since).getFullYear()}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Job Detail Drawer ────────────────────────────────────────────────────────

function JobDrawer({
    vacancy,
    hasApplied,
    isAuthenticated,
    isSaved,
    savingBookmark,
    onClose,
    onApply,
    onToggleSave,
}: {
    vacancy: Vacancy;
    hasApplied: boolean;
    isAuthenticated: boolean;
    isSaved: boolean;
    savingBookmark: boolean;
    onClose: () => void;
    onApply: () => void;
    onToggleSave: () => void;
}) {
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline
        ? daysUntil(vacancy.application_deadline)
        : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired = vacancy.is_expired ?? (deadline !== null && deadline < 0);
    const tags = vacancy.tags ?? [];

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
                                {vacancy.employer?.company_name && (
                                    <p className="mt-1 text-sm font-medium text-slate-600">
                                        {vacancy.employer.company_name}
                                    </p>
                                )}
                                <div className="mt-2">
                                    <VerificationBadges employer={vacancy.employer} />
                                </div>
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

                        {tags.length > 0 && (
                            <div className="mt-3">
                                <TagList tags={tags} />
                            </div>
                        )}
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

                    {/* Employer hiring history — builds trust before applying */}
                    {vacancy.employer_stats && (
                        <EmployerHistoryCard stats={vacancy.employer_stats} />
                    )}
                </div>

                {/* Sticky footer with Apply button */}
                <div className="flex gap-3 border-t border-slate-100 bg-white px-6 py-4">
                    {!isAuthenticated ? (
                        <button
                            onClick={onApply}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                            Log in to Apply
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M1.5 2.5l13 5.5-13 5.5V9l9-1-9-1V2.5z" />
                            </svg>
                        </button>
                    ) : hasApplied ? (
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
                    {isAuthenticated && (
                        <button
                            type="button"
                            onClick={onToggleSave}
                            disabled={savingBookmark}
                            title={
                                isSaved
                                    ? 'Remove from saved jobs'
                                    : 'Save job for later'
                            }
                            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
                                isSaved
                                    ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                                    : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            }`}
                        >
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 16 16"
                                fill={isSaved ? 'currentColor' : 'none'}
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
                    )}
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
    const isExpired =
        vacancy.is_expired ?? (deadline !== null && deadline < 0);
    const tags = vacancy.tags ?? [];

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
                        {vacancy.employer?.company_name && (
                            <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                                {vacancy.employer.company_name}
                            </p>
                        )}
                        <VerificationBadges employer={vacancy.employer} />
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
                    {!isExpired ? (
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
                {vacancy.employer_stats && (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            vacancy.employer_stats.total_hires > 0
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                    >
                        <svg
                            className="h-3 w-3"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path strokeLinecap="round" d="M2 8l4 4 8-8" />
                        </svg>
                        {vacancy.employer_stats.total_hires}{' '}
                        {vacancy.employer_stats.total_hires === 1
                            ? 'hire'
                            : 'hires'}
                    </span>
                )}
            </div>

            {tags.length > 0 && (
                <div className="mb-4">
                    <TagList tags={tags} max={4} />
                </div>
            )}

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

// ─── Guest (unauthenticated) UI ───────────────────────────────────────────────

function GuestSidebar() {
    return (
        <aside className="w-60 shrink-0 space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
                        />
                    </svg>
                </div>
                <h2 className="text-[14px] font-bold text-slate-900">
                    Join to apply
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                    Create an account to apply for jobs, get AI recommendations,
                    and track your applications.
                </p>
                <a
                    href="/register"
                    className="mt-4 block rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                    Sign up
                </a>
                <a
                    href="/login"
                    className="mt-2 block rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                    Log in
                </a>
            </div>
            <Link
                href="/hiring-statistics"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
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
                            d="M2 13h12M4 13V7M8 13V3M12 13V9"
                        />
                    </svg>
                </span>
            </Link>
        </aside>
    );
}

function GuestHero({ count }: { count: number }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-5 py-6 sm:px-6">
            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-blue-700 uppercase">
                Job board
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Find your next opportunity
            </h1>
            <p className="mt-1 text-sm font-medium text-blue-700/90">
                Browse open roles from employers actively hiring.
            </p>
            <p className="mt-2 text-sm text-slate-500">
                {count} {count === 1 ? 'position' : 'positions'} available · log
                in to apply.
            </p>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FilterWorkType = 'all' | Vacancy['work_type'];
type FilterEmployment = 'all' | Vacancy['employment_type'];
type FilterDeadline = 'all' | 'urgent' | 'closing_soon';
type SortOption =
    | 'newest'
    | 'salary_high'
    | 'salary_low'
    | 'deadline_soon'
    | 'match_score';

export default function JobListings({
    vacancies,
    applied_ids = [],
    saved_ids = [],
    user_cvs = [],
    ai_matches = {},
    ai_matching_hint = null,
    ai_matching_debug = null,
    sidebar_stats,
    profile_completion = 0,
    is_authenticated = true,
    pageMode = 'board',
}: Props) {
    const { auth } = usePage<{ auth: { user: AuthUser | null } }>().props;
    const user = auth.user;
    const isAuthenticated = is_authenticated && !!user;
    const retriedAiMatches = useRef(false);

    // If the user has a CV but the first request returned no scores (timeout, config), retry once.
    useEffect(() => {
        if (
            retriedAiMatches.current ||
            !isAuthenticated ||
            user_cvs.length === 0 ||
            vacancies.length === 0
        ) {
            return;
        }

        const hasAnyScore = vacancies.some(
            (v) => lookupMatchScore(ai_matches, v) !== undefined,
        );

        if (hasAnyScore) {
            return;
        }

        retriedAiMatches.current = true;

        router.reload({
            only: ['vacancies', 'ai_matches'],
            preserveScroll: true,
        });
    }, [isAuthenticated, user_cvs.length, vacancies.length, ai_matches]);

    const [search, setSearch] = useState('');
    const [workType, setWorkType] = useState<FilterWorkType>('all');
    const [employment, setEmployment] = useState<FilterEmployment>('all');
    const [locationFilter, setLocationFilter] = useState('');
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [deadlineFilter, setDeadlineFilter] = useState<FilterDeadline>('all');
    const [minMatchPct, setMinMatchPct] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selected, setSelected] = useState<Vacancy | null>(null);
    const [applying, setApplying] = useState<Vacancy | null>(null);
    const [screening, setScreening] = useState<Vacancy | null>(null);
    const [activeTab, setActiveTab] = useState<
        'all' | 'recommended' | 'saved'
    >('all');

    // Track applied IDs locally so the UI updates after submission without a full page reload
    const [localAppliedIds, setLocalAppliedIds] =
        useState<number[]>(applied_ids);

    const [localSavedIds, setLocalSavedIds] = useState<number[]>(saved_ids);
    const [savingBookmarkId, setSavingBookmarkId] = useState<number | null>(
        null,
    );

    // Auto-open drawer from Telegram/share deep-link: /jobs?vacancy=<id>
    useEffect(() => {
        if (pageMode !== 'board') return;
        const params = new URLSearchParams(window.location.search);
        const vacancyId = params.get('vacancy');
        if (!vacancyId) return;
        const target = vacancies.find((v) => v.id === parseInt(vacancyId, 10));
        if (target) setSelected(target);
    }, [vacancies, pageMode]);

    const closeDrawer = () => {
        setSelected(null);
        // Strip the ?vacancy= param so a refresh doesn't re-open the drawer
        const url = new URL(window.location.href);
        if (url.searchParams.has('vacancy')) {
            url.searchParams.delete('vacancy');
            window.history.replaceState({}, '', url.toString());
        }
    };

    const allLocations = Array.from(
        new Set(
            vacancies
                .map((v) => v.location?.trim())
                .filter((loc): loc is string => Boolean(loc)),
        ),
    ).sort();

    function matchesFilters(v: Vacancy): boolean {
        if (workType !== 'all' && v.work_type !== workType) return false;
        if (employment !== 'all' && v.employment_type !== employment)
            return false;
        if (locationFilter && (v.location ?? '') !== locationFilter) {
            return false;
        }
        if (verifiedOnly && !isEmployerVerified(v.employer)) {
            return false;
        }
        if (deadlineFilter !== 'all' && v.application_deadline) {
            const days = daysUntil(v.application_deadline);
            if (deadlineFilter === 'urgent' && (days < 0 || days > 5)) {
                return false;
            }
            if (
                deadlineFilter === 'closing_soon' &&
                (days < 0 || days > 14)
            ) {
                return false;
            }
        } else if (deadlineFilter !== 'all' && !v.application_deadline) {
            return false;
        }
        const filterMin = salaryMin ? parseFloat(salaryMin) : null;
        const filterMax = salaryMax ? parseFloat(salaryMax) : null;
        if (filterMin !== null || filterMax !== null) {
            const vMin = salaryMinValue(v.salary_min, v.salary_max);
            const vMax = salaryMaxValue(v.salary_min, v.salary_max);
            if (vMin === null && vMax === null) return false;
            const effectiveMin = vMin ?? vMax!;
            const effectiveMax = vMax ?? vMin!;
            if (filterMin !== null && effectiveMax < filterMin) return false;
            if (filterMax !== null && effectiveMin > filterMax) return false;
        }
        const minMatch = minMatchPct ? parseInt(minMatchPct, 10) / 100 : null;
        if (minMatch !== null && !Number.isNaN(minMatch)) {
            const score = lookupMatchScore(ai_matches, v) ?? 0;
            if (score < minMatch) return false;
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                v.title.toLowerCase().includes(q) ||
                v.description.toLowerCase().includes(q) ||
                (v.location ?? '').toLowerCase().includes(q) ||
                (v.tags ?? []).some((t) => t.toLowerCase().includes(q))
            );
        }
        return true;
    }

    function sortVacancies(list: Vacancy[]): Vacancy[] {
        const sorted = [...list];
        sorted.sort((a, b) => {
            switch (sortBy) {
                case 'salary_high': {
                    const aSal =
                        salaryMaxValue(a.salary_min, a.salary_max) ?? -1;
                    const bSal =
                        salaryMaxValue(b.salary_min, b.salary_max) ?? -1;
                    return bSal - aSal;
                }
                case 'salary_low': {
                    const aSal =
                        salaryMinValue(a.salary_min, a.salary_max) ?? Infinity;
                    const bSal =
                        salaryMinValue(b.salary_min, b.salary_max) ?? Infinity;
                    return aSal - bSal;
                }
                case 'deadline_soon': {
                    const aDays = a.application_deadline
                        ? daysUntil(a.application_deadline)
                        : Infinity;
                    const bDays = b.application_deadline
                        ? daysUntil(b.application_deadline)
                        : Infinity;
                    return aDays - bDays;
                }
                case 'match_score':
                    return (
                        (lookupMatchScore(ai_matches, b) ?? 0) -
                        (lookupMatchScore(ai_matches, a) ?? 0)
                    );
                case 'newest':
                default:
                    return (
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    );
            }
        });
        return sorted;
    }

    const filtered = sortVacancies(vacancies.filter(matchesFilters));

    const hasAiMatches =
        Object.keys(ai_matches).length > 0 ||
        vacancies.some((v) => lookupMatchScore(ai_matches, v) !== undefined);

    // AI-ranked list: vacancies with score >= 30%, sorted best-first, respects active filters
    const aiRecommended = hasAiMatches
        ? sortVacancies(
              vacancies
                  .filter(
                      (v) =>
                          (lookupMatchScore(ai_matches, v) ?? 0) >= 0.3 &&
                          matchesFilters(v),
                  ),
          )
        : [];

    const displayList =
        activeTab === 'recommended'
            ? aiRecommended
            : activeTab === 'saved'
              ? filtered.filter((v) => localSavedIds.includes(v.id))
              : filtered;

    function toggleSave(vacancyId: number) {
        if (!isAuthenticated || savingBookmarkId !== null) {
            return;
        }

        const currentlySaved = localSavedIds.includes(vacancyId);
        setSavingBookmarkId(vacancyId);

        if (currentlySaved) {
            router.delete(`/saved-jobs/${vacancyId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setLocalSavedIds((prev) =>
                        prev.filter((id) => id !== vacancyId),
                    );
                    if (pageMode === 'saved' && selected?.id === vacancyId) {
                        setSelected(null);
                    }
                },
                onFinish: () => setSavingBookmarkId(null),
            });
        } else {
            router.post(
                `/saved-jobs/${vacancyId}`,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setLocalSavedIds((prev) => [...prev, vacancyId]);
                    },
                    onFinish: () => setSavingBookmarkId(null),
                },
            );
        }
    }

    function openApply(vacancy: Vacancy) {
        // Guests must sign in before applying.
        if (!isAuthenticated) {
            router.visit(
                `/login?redirect=${encodeURIComponent('/jobs')}`,
            );
            return;
        }
        setSelected(null); // close drawer
        if (vacancy.screening_required) {
            setScreening(vacancy);
        } else {
            setApplying(vacancy);
        }
    }

    function onScreeningComplete() {
        const v = screening;
        setScreening(null);
        if (v) setApplying(v);
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
                {isAuthenticated && user ? (
                    <ProfileSidebar
                        user={user}
                        stats={sidebar_stats ?? undefined}
                        profileCompletion={profile_completion}
                    />
                ) : (
                    <GuestSidebar />
                )}

                <div className="min-w-0 flex-1 space-y-4">
                    {isAuthenticated ? (
                        <DashboardWelcome
                            meta={
                                activeTab === 'recommended'
                                    ? `${aiRecommended.length} AI ${aiRecommended.length === 1 ? 'match' : 'matches'} based on your profile`
                                    : `${filtered.length} ${filtered.length === 1 ? 'position' : 'positions'} available on the job board`
                            }
                        />
                    ) : (
                        <GuestHero count={filtered.length} />
                    )}

                    {isAuthenticated && ai_matching_hint && !hasAiMatches && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {ai_matching_hint}
                        </div>
                    )}

                    {isAuthenticated &&
                        ai_matching_debug &&
                        typeof ai_matching_debug.status === 'string' && (
                            <details className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                                <summary className="cursor-pointer font-semibold text-slate-900">
                                    AI matching debug ({ai_matching_debug.status as string})
                                </summary>
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(ai_matching_debug, null, 2)}
                                </pre>
                            </details>
                        )}

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                {pageMode === 'saved' ? 'Saved jobs' : 'Job board'}
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-400">
                                {pageMode === 'saved'
                                    ? 'Roles you bookmarked to review or apply later'
                                    : activeTab === 'recommended'
                                      ? 'Sorted by AI match score'
                                      : activeTab === 'saved'
                                        ? 'Your bookmarked roles'
                                        : 'Search and filter open roles'}
                            </p>
                        </div>
                        {pageMode === 'board' && isAuthenticated && (
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
                                    onClick={() => setActiveTab('saved')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                                        activeTab === 'saved'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 16 16"
                                        fill={
                                            activeTab === 'saved'
                                                ? 'currentColor'
                                                : 'none'
                                        }
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.5 2.5h11v12l-5.5-3-5.5 3z"
                                        />
                                    </svg>
                                    Saved
                                    {localSavedIds.length > 0 && (
                                        <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                                activeTab === 'saved'
                                                    ? 'bg-amber-400 text-white'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}
                                        >
                                            {localSavedIds.length}
                                        </span>
                                    )}
                                </button>
                                {hasAiMatches && (
                                    <button
                                        onClick={() =>
                                            setActiveTab('recommended')
                                        }
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
                                )}
                            </div>
                        )}
                        {pageMode === 'board' &&
                            !isAuthenticated &&
                            hasAiMatches && (
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
                            <select
                                value={sortBy}
                                onChange={(e) =>
                                    setSortBy(e.target.value as SortOption)
                                }
                                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="newest">Newest first</option>
                                <option value="salary_high">
                                    Salary: high to low
                                </option>
                                <option value="salary_low">
                                    Salary: low to high
                                </option>
                                <option value="deadline_soon">
                                    Deadline soonest
                                </option>
                                {hasAiMatches && (
                                    <option value="match_score">
                                        Best AI match
                                    </option>
                                )}
                            </select>
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAdvancedFilters((v) => !v)
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                {showAdvancedFilters
                                    ? 'Hide filters'
                                    : 'More filters'}
                            </button>
                        </div>

                        {showAdvancedFilters && (
                            <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                        Location
                                    </label>
                                    <select
                                        value={locationFilter}
                                        onChange={(e) =>
                                            setLocationFilter(e.target.value)
                                        }
                                        className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="">All locations</option>
                                        {allLocations.map((loc) => (
                                            <option key={loc} value={loc}>
                                                {loc}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                        Min salary (BIRR)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="e.g. 10000"
                                        value={salaryMin}
                                        onChange={(e) =>
                                            setSalaryMin(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                        Max salary (BIRR)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="e.g. 50000"
                                        value={salaryMax}
                                        onChange={(e) =>
                                            setSalaryMax(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                        Deadline
                                    </label>
                                    <select
                                        value={deadlineFilter}
                                        onChange={(e) =>
                                            setDeadlineFilter(
                                                e.target
                                                    .value as FilterDeadline,
                                            )
                                        }
                                        className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
                                    >
                                        <option value="all">Any deadline</option>
                                        <option value="urgent">
                                            Urgent (≤5 days)
                                        </option>
                                        <option value="closing_soon">
                                            Closing soon (≤14 days)
                                        </option>
                                    </select>
                                </div>
                                {hasAiMatches && (
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                            Min AI match %
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            placeholder="e.g. 50"
                                            value={minMatchPct}
                                            onChange={(e) =>
                                                setMinMatchPct(e.target.value)
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                )}
                                <div className="flex items-end">
                                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={verifiedOnly}
                                            onChange={(e) =>
                                                setVerifiedOnly(
                                                    e.target.checked,
                                                )
                                            }
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                                        />
                                        Verified employers only
                                    </label>
                                </div>
                            </div>
                        )}
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
                            ) : activeTab === 'saved' || pageMode === 'saved' ? (
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
                                            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                                        />
                                    </svg>
                                    <p className="font-medium text-slate-500">
                                        No saved jobs yet
                                    </p>
                                    <p className="mt-1 text-sm">
                                        Bookmark roles from the job board to
                                        review them here later
                                    </p>
                                    {pageMode === 'saved' && (
                                        <Link
                                            href="/jobs"
                                            className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                                        >
                                            Browse jobs
                                        </Link>
                                    )}
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
                                    matchScore={lookupMatchScore(ai_matches, v)}
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
                    isAuthenticated={isAuthenticated}
                    isSaved={localSavedIds.includes(selected.id)}
                    savingBookmark={savingBookmarkId === selected.id}
                    onClose={closeDrawer}
                    onApply={() => openApply(selected)}
                    onToggleSave={() => toggleSave(selected.id)}
                />
            )}

            {/* Screening chat (gates apply if vacancy.screening_required) */}
            {screening && (
                <ScreeningChat
                    vacancyId={screening.id}
                    vacancyTitle={screening.title}
                    onClose={() => setScreening(null)}
                    onComplete={onScreeningComplete}
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
