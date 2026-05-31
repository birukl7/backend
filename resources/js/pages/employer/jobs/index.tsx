import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import EmployerScreeningSetup from '@/components/employer-screening-setup';

// ─── Types ────────────────────────────────────────────────────────────────────

type EmploymentType =
    | 'full_time'
    | 'part_time'
    | 'contract'
    | 'temporary'
    | 'internship';
type WorkType = 'remote' | 'on_site' | 'hybrid';
type Status = 'open' | 'closed';
type ApplicationStatus =
    | 'pending'
    | 'applied'
    | 'shortlisted'
    | 'rejected'
    | 'hired';

interface Vacancy {
    id: number;
    title: string;
    description: string;
    requirements: string | null;
    tags?: string[] | null;
    location: string | null;
    salary_min: string | null;
    salary_max: string | null;
    employment_type: EmploymentType;
    status: Status;
    work_type: WorkType;
    application_deadline: string | null;
    created_at: string;
    updated_at: string;
    is_expired?: boolean;
    applications_count?: number;
    hires_count?: number;
}

interface HiringStats {
    employer_id: number;
    employer_name: string | null;
    total_jobs: number;
    total_applications: number;
    total_hires: number;
    hires_last_30_days: number;
    hire_rate: number;
    member_since: string | null;
}

interface Application {
    id: number;
    vacancy_id: number;
    user_id: number;
    cover_letter: string | null;
    status: ApplicationStatus;
    created_at: string;
    user: { id: number; name: string; email: string };
    cv: { id: number; title: string; full_name: string | null } | null;
}

interface Props {
    vacancies: Vacancy[];
    hiring_stats?: HiringStats;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    temporary: 'Temporary',
    internship: 'Internship',
};
const WORK_TYPE_LABELS: Record<WorkType, string> = {
    remote: 'Remote',
    on_site: 'On-site',
    hybrid: 'Hybrid',
};
const WORK_TYPE_COLORS: Record<WorkType, string> = {
    remote: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_site: 'bg-slate-100 text-slate-600 border-slate-200',
    hybrid: 'bg-violet-50 text-violet-700 border-violet-200',
};
const EMPLOYMENT_COLORS: Record<EmploymentType, string> = {
    full_time: 'bg-blue-50 text-blue-700 border-blue-200',
    part_time: 'bg-amber-50 text-amber-700 border-amber-200',
    contract: 'bg-orange-50 text-orange-700 border-orange-200',
    temporary: 'bg-pink-50 text-pink-700 border-pink-200',
    internship: 'bg-teal-50 text-teal-700 border-teal-200',
};

const APP_STATUS_STYLES: Record<
    ApplicationStatus,
    { bg: string; text: string; label: string }
> = {
    pending: {
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        label: 'Pending',
    },
    applied: {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-700',
        label: 'Applied',
    },
    shortlisted: {
        bg: 'bg-violet-50 border-violet-200',
        text: 'text-violet-700',
        label: 'Shortlisted',
    },
    rejected: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-600',
        label: 'Rejected',
    },
    hired: {
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        label: 'Hired',
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(min: string | null, max: string | null): string {
    if (!min && !max) return 'Not specified';
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

function deadlineLabel(deadline: number | null, isExpired: boolean): string {
    if (isExpired) return 'Expired';
    if (deadline === null) return 'No deadline';
    if (deadline === 0) return 'Closes today';
    if (deadline === 1) return '1 day left';
    return `${deadline} days left`;
}

function initials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

// ─── Shared field component ───────────────────────────────────────────────────

const inp =
    'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300';
const inp2col = inp;

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-1.5 block text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
            {children}
        </label>
    );
}
function FieldErr({ msg }: { msg?: string }) {
    return msg ? <p className="mt-1 text-[11px] text-red-500">{msg}</p> : null;
}

function TagsField({
    tags,
    onChange,
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
}) {
    const [input, setInput] = useState('');

    function addTag(raw: string) {
        const value = raw.trim().replace(/^#/, '').toLowerCase();
        if (!value || tags.includes(value) || tags.length >= 20) return;
        onChange([...tags, value]);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
            setInput('');
        } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-200">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[12px] font-medium text-indigo-600"
                >
                    #{tag}
                    <button
                        type="button"
                        onClick={() => onChange(tags.filter((t) => t !== tag))}
                        className="text-indigo-400 transition-colors hover:text-indigo-700"
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    addTag(input);
                    setInput('');
                }}
                placeholder={
                    tags.length === 0 ? 'react, remote, senior…' : 'Add tag…'
                }
                className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
            />
        </div>
    );
}

// ─── Application Status Updater ───────────────────────────────────────────────

function StatusDropdown({
    applicationId,
    current,
    onChange,
}: {
    applicationId: number;
    current: ApplicationStatus;
    onChange: (id: number, status: ApplicationStatus) => void;
}) {
    const [loading, setLoading] = useState(false);

    async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const next = e.target.value as ApplicationStatus;
        setLoading(true);
        try {
            await fetch(`/employer/applications/${applicationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (
                            document.querySelector(
                                'meta[name="csrf-token"]',
                            ) as HTMLMetaElement
                        )?.content ?? '',
                },
                body: JSON.stringify({ status: next }),
            });
            onChange(applicationId, next);
        } finally {
            setLoading(false);
        }
    }

    const style = APP_STATUS_STYLES[current];

    return (
        <div className="relative">
            <select
                value={current}
                onChange={handleChange}
                disabled={loading}
                className={`cursor-pointer appearance-none rounded-full border py-1 pr-6 pl-2.5 text-[11px] font-semibold transition-colors outline-none disabled:opacity-60 ${style.bg} ${style.text}`}
            >
                {(Object.keys(APP_STATUS_STYLES) as ApplicationStatus[]).map(
                    (s) => (
                        <option key={s} value={s}>
                            {APP_STATUS_STYLES[s].label}
                        </option>
                    ),
                )}
            </select>
            {loading && (
                <svg
                    className="absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 animate-spin text-slate-400"
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
            )}
        </div>
    );
}

// ─── Applicant Row ────────────────────────────────────────────────────────────

function ApplicantRow({
    app,
    onStatusChange,
}: {
    app: Application;
    onStatusChange: (id: number, status: ApplicationStatus) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`overflow-hidden rounded-2xl border transition-all ${expanded ? 'border-blue-200 shadow-sm' : 'border-slate-200'}`}
        >
            {/* Row header */}
            <div
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                onClick={() => setExpanded((p) => !p)}
            >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-[13px] font-bold text-blue-700">
                    {initials(app.user.name)}
                </div>

                {/* Name + email */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight font-semibold text-slate-900">
                        {app.user.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                        {app.user.email}
                    </p>
                </div>

                {/* CV chip */}
                {app.cv && (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 sm:inline-flex">
                        <svg
                            className="h-3 w-3"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path
                                strokeLinecap="round"
                                d="M11 2H5a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1zM5.5 6h5M5.5 9h3"
                            />
                        </svg>
                        {app.cv.title}
                    </span>
                )}

                {/* Status dropdown */}
                <div onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                        applicationId={app.id}
                        current={app.status}
                        onChange={onStatusChange}
                    />
                </div>

                {/* Applied date */}
                <span className="hidden shrink-0 text-[11px] text-slate-400 md:block">
                    {timeAgo(app.created_at)}
                </span>

                {/* Chevron */}
                <svg
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>

            {/* Expanded: cover letter + CV detail */}
            {expanded && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-4 pt-1 pb-4">
                    {/* CV info */}
                    {app.cv && (
                        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                                <svg
                                    className="h-4 w-4 text-white"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        d="M11 2H5a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1zM5.5 6h5M5.5 9h3"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                    Resume
                                </p>
                                <p className="text-[13px] font-semibold text-slate-800">
                                    {app.cv.title}
                                </p>
                                {app.cv.full_name && (
                                    <p className="text-[11px] text-slate-400">
                                        {app.cv.full_name}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Cover letter */}
                    <div>
                        <p className="mb-1.5 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                            Cover Letter
                        </p>
                        {app.cover_letter ? (
                            <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-[13px] leading-relaxed whitespace-pre-line text-slate-700">
                                {app.cover_letter}
                            </p>
                        ) : (
                            <p className="px-1 text-[13px] text-slate-300 italic">
                                No cover letter submitted.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── AI Suggestions Panel ───────────────────────────────────────────────────

interface AiSuggestion {
    user_id: number;
    user_name: string;
    user_email: string;
    match_score: number;
    match_percent: number;
}

function AiSuggestionsPanel({ vacancyId }: { vacancyId: number }) {
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [invited, setInvited] = useState<Set<number>>(new Set());
    const [inviting, setInviting] = useState<number | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/employer/jobs/${vacancyId}/ai-suggestions`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => {
                setSuggestions(data.suggestions ?? []);
                // Seed invited set from server so it survives page refreshes
                const serverInvited: number[] = data.already_invited_ids ?? [];
                if (serverInvited.length > 0) {
                    setInvited(new Set(serverInvited));
                }
            })
            .catch(() => setSuggestions([]))
            .finally(() => setLoading(false));
    }, [vacancyId]);

    async function invite(userId: number) {
        setInviting(userId);
        setInviteError(null);
        try {
            const res = await fetch(
                `/employer/jobs/${vacancyId}/invite/${userId}`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            (
                                document.querySelector(
                                    'meta[name="csrf-token"]',
                                ) as HTMLMetaElement
                            )?.content ?? '',
                    },
                },
            );
            if (!res.ok) {
                setInviteError(
                    'Failed to send notification. Please try again.',
                );
                return;
            }
            setInvited((prev) => new Set(prev).add(userId));
        } catch {
            setInviteError('Network error. Please try again.');
        } finally {
            setInviting(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <svg
                    className="h-5 w-5 animate-spin text-blue-400"
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
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="py-16 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                    <svg
                        className="h-7 w-7 text-indigo-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                        />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                    No AI match data yet
                </p>
                <p className="mx-auto mt-0.5 max-w-xs text-[13px] text-slate-400">
                    Suggestions appear once job seekers with matching CVs browse
                    jobs.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {inviteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
                    {inviteError}
                </div>
            )}
            {suggestions.map((s) => {
                const isInvited = invited.has(s.user_id);
                const isInviting = inviting === s.user_id;
                const barColor =
                    s.match_percent >= 70
                        ? 'bg-emerald-500'
                        : s.match_percent >= 50
                          ? 'bg-amber-400'
                          : 'bg-red-400';
                const textColor =
                    s.match_percent >= 70
                        ? 'text-emerald-600'
                        : s.match_percent >= 50
                          ? 'text-amber-500'
                          : 'text-red-500';
                const userInitials = s.user_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                return (
                    <div
                        key={s.user_id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-700">
                            {userInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] leading-tight font-semibold text-slate-900">
                                {s.user_name}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                                {s.user_email}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all ${barColor}`}
                                        style={{ width: `${s.match_percent}%` }}
                                    />
                                </div>
                                <span
                                    className={`shrink-0 text-[11px] font-semibold ${textColor}`}
                                >
                                    {s.match_percent}% match
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => invite(s.user_id)}
                            disabled={isInvited || isInviting}
                            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                                isInvited
                                    ? 'cursor-default border border-emerald-200 bg-emerald-50 text-emerald-600'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                            }`}
                        >
                            {isInviting && (
                                <svg
                                    className="h-3 w-3 animate-spin"
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
                            )}
                            {isInvited
                                ? 'Notified ✓'
                                : isInviting
                                  ? 'Notifying…'
                                  : 'Notify'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Applicants Panel ─────────────────────────────────────────────────────────

function ApplicantsPanel({ vacancyId }: { vacancyId: number }) {
    type AppSubTab = 'applied' | 'suggested';
    const [subTab, setSubTab] = useState<AppSubTab>('applied');
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');

    useEffect(() => {
        setLoading(true);
        fetch(`/employer/jobs/${vacancyId}/applications`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => {
                setApplications(Array.isArray(data) ? data : []);
            })
            .catch(() => setApplications([]))
            .finally(() => setLoading(false));
    }, [vacancyId]);

    function handleStatusChange(id: number, status: ApplicationStatus) {
        setApplications((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status } : a)),
        );
    }

    const filtered =
        filter === 'all'
            ? applications
            : applications.filter((a) => a.status === filter);

    // Status counts
    const counts = (
        Object.keys(APP_STATUS_STYLES) as ApplicationStatus[]
    ).reduce(
        (acc, s) => ({
            ...acc,
            [s]: applications.filter((a) => a.status === s).length,
        }),
        {} as Record<ApplicationStatus, number>,
    );

    return (
        <div className="space-y-4">
            {/* Sub-tab bar */}
            <div className="flex gap-1 border-b border-slate-100">
                <button
                    onClick={() => setSubTab('applied')}
                    className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
                        subTab === 'applied'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Applied ({loading ? '…' : applications.length})
                </button>
                <button
                    onClick={() => setSubTab('suggested')}
                    className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
                        subTab === 'suggested'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    AI Suggested ✨
                </button>
            </div>

            {subTab === 'suggested' ? (
                <AiSuggestionsPanel vacancyId={vacancyId} />
            ) : loading ? (
                <div className="flex items-center justify-center py-16">
                    <svg
                        className="h-5 w-5 animate-spin text-blue-400"
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
                </div>
            ) : applications.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <svg
                            className="h-7 w-7 text-slate-300"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                        No applications yet
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-400">
                        Applications will appear here once candidates apply.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Summary chips */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${filter === 'all' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300'}`}
                        >
                            All ({applications.length})
                        </button>
                        {(Object.keys(APP_STATUS_STYLES) as ApplicationStatus[])
                            .filter((s) => counts[s] > 0)
                            .map((s) => {
                                const style = APP_STATUS_STYLES[s];
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                                            filter === s
                                                ? `${style.bg} ${style.text} ring-2 ring-current ring-offset-1`
                                                : `${style.bg} ${style.text} border-transparent`
                                        }`}
                                    >
                                        {style.label} ({counts[s]})
                                    </button>
                                );
                            })}
                    </div>

                    {/* Applicant rows */}
                    <div className="space-y-2">
                        {filtered.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-400">
                                No applicants with this status.
                            </p>
                        ) : (
                            filtered.map((app) => (
                                <ApplicantRow
                                    key={app.id}
                                    app={app}
                                    onStatusChange={handleStatusChange}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Job Dialog ───────────────────────────────────────────────────────────────

type DialogMode = 'create' | 'edit' | 'view';
type ViewTab = 'details' | 'applicants' | 'screening';

interface DialogProps {
    mode: DialogMode;
    vacancy?: Vacancy;
    onClose: () => void;
}

const defaultForm = {
    title: '',
    description: '',
    requirements: '',
    tags: [] as string[],
    location: '',
    salary_min: '',
    salary_max: '',
    employment_type: 'full_time' as EmploymentType,
    work_type: 'on_site' as WorkType,
    application_deadline: '',
};

function JobDialog({ mode, vacancy, onClose }: DialogProps) {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isCreate = mode === 'create';

    const [viewTab, setViewTab] = useState<ViewTab>('details');

    const { data, setData, post, put, processing, errors, reset } = useForm(
        vacancy
            ? {
                  title: vacancy.title,
                  description: vacancy.description,
                  requirements: vacancy.requirements ?? '',
                  tags: vacancy.tags ?? [],
                  location: vacancy.location ?? '',
                  salary_min: vacancy.salary_min ?? '',
                  salary_max: vacancy.salary_max ?? '',
                  employment_type: vacancy.employment_type,
                  work_type: vacancy.work_type,
                  application_deadline: vacancy.application_deadline ?? '',
              }
            : { ...defaultForm },
    );

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && vacancy) {
            put(`/employer/jobs/${vacancy.id}`, { onSuccess: onClose });
        } else {
            post('/employer/jobs', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    }

    const deadline = vacancy?.application_deadline
        ? daysUntil(vacancy.application_deadline)
        : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px]"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="animate-dialog-in flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Dialog Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-8 py-5">
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl ${isCreate ? 'bg-blue-600' : isEdit ? 'bg-amber-500' : 'bg-slate-100'}`}
                            >
                                {isCreate && (
                                    <svg
                                        className="h-4 w-4 text-white"
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                    >
                                        <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                                    </svg>
                                )}
                                {isEdit && (
                                    <svg
                                        className="h-4 w-4 text-white"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"
                                        />
                                    </svg>
                                )}
                                {isView && (
                                    <svg
                                        className="h-4 w-4 text-slate-500"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                                        />
                                        <circle cx="8" cy="8" r="2" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    {isCreate
                                        ? 'Post a New Job'
                                        : isEdit
                                          ? 'Edit Job Posting'
                                          : vacancy?.title}
                                </h2>
                                <p className="mt-0.5 text-[12px] text-slate-400">
                                    {isCreate
                                        ? 'Fill in the details below to publish your vacancy'
                                        : isEdit
                                          ? 'Update the vacancy details'
                                          : `Posted ${timeAgo(vacancy!.created_at)}`}
                                </p>
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

                    {/* Tabs — only in view mode */}
                    {isView && (
                        <div className="flex shrink-0 gap-1 border-b border-slate-100 px-8 pt-3">
                            {(['details', 'applicants', 'screening'] as ViewTab[]).map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setViewTab(tab)}
                                        className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-[13px] font-medium capitalize transition-colors ${
                                            viewTab === tab
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {tab === 'details'
                                            ? 'Details'
                                            : tab === 'applicants'
                                              ? 'Applicants'
                                              : 'Screening'}
                                        {tab === 'screening' && (
                                            <span className="ml-1.5 inline-flex items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                                AI
                                            </span>
                                        )}
                                    </button>
                                ),
                            )}
                        </div>
                    )}

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        {isView && vacancy ? (
                            viewTab === 'screening' ? (
                                // ── Screening tab ──────────────────────────────────
                                <EmployerScreeningSetup vacancyId={vacancy.id} />
                            ) : viewTab === 'details' ? (
                                // ── Details tab ────────────────────────────────────
                                <div className="space-y-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${!vacancy.is_expired ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${!vacancy.is_expired ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                            />
                                            {deadlineLabel(
                                                vacancy.application_deadline
                                                    ? daysUntil(
                                                          vacancy.application_deadline,
                                                      )
                                                    : null,
                                                vacancy.is_expired ?? false,
                                            )}
                                        </span>
                                        <span
                                            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${WORK_TYPE_COLORS[vacancy.work_type]}`}
                                        >
                                            {
                                                WORK_TYPE_LABELS[
                                                    vacancy.work_type
                                                ]
                                            }
                                        </span>
                                        <span
                                            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}
                                        >
                                            {
                                                EMPLOYMENT_LABELS[
                                                    vacancy.employment_type
                                                ]
                                            }
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                        {[
                                            {
                                                label: 'Salary',
                                                value: formatSalary(
                                                    vacancy.salary_min,
                                                    vacancy.salary_max,
                                                ),
                                            },
                                            {
                                                label: 'Location',
                                                value:
                                                    vacancy.location ||
                                                    'Not specified',
                                            },
                                            {
                                                label: 'Deadline',
                                                value: vacancy.application_deadline
                                                    ? new Date(
                                                          vacancy.application_deadline,
                                                      ).toLocaleDateString(
                                                          'en-US',
                                                          {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              year: 'numeric',
                                                          },
                                                      )
                                                    : 'No deadline',
                                                urgent: isUrgent,
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                                            >
                                                <p className="mb-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                    {item.label}
                                                </p>
                                                <p
                                                    className={`text-sm font-semibold ${item.urgent ? 'text-red-500' : 'text-slate-800'}`}
                                                >
                                                    {item.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                                            Description
                                        </p>
                                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                                            {vacancy.description}
                                        </p>
                                    </div>

                                    {vacancy.requirements && (
                                        <div>
                                            <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                                                Requirements
                                            </p>
                                            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                                                {vacancy.requirements}
                                            </p>
                                        </div>
                                    )}

                                    {vacancy.tags &&
                                        vacancy.tags.length > 0 && (
                                            <div>
                                                <p className="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                                                    Tags
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {vacancy.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    {isUrgent && deadline !== null && (
                                        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                                            <svg
                                                className="h-4 w-4 shrink-0 text-red-400"
                                                viewBox="0 0 16 16"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <p className="text-[13px] font-medium text-red-600">
                                                {deadline === 0
                                                    ? 'Closes today!'
                                                    : `${deadline} day${deadline === 1 ? '' : 's'} left to apply`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // ── Applicants tab ──────────────────────────────────
                                <ApplicantsPanel vacancyId={vacancy.id} />
                            )
                        ) : (
                            // ── Create / Edit form ──────────────────────────────────
                            <form
                                id="job-form"
                                onSubmit={submit}
                                className="space-y-5"
                            >
                                <div>
                                    <Label>
                                        Job Title{' '}
                                        <span className="text-red-400">*</span>
                                    </Label>
                                    <input
                                        className={inp}
                                        value={data.title}
                                        onChange={(e) =>
                                            setData('title', e.target.value)
                                        }
                                        placeholder="e.g. Senior Frontend Engineer"
                                        required
                                    />
                                    <FieldErr msg={errors.title} />
                                </div>
                                <div>
                                    <Label>
                                        Description{' '}
                                        <span className="text-red-400">*</span>
                                    </Label>
                                    <textarea
                                        className={inp + ' resize-none'}
                                        rows={5}
                                        value={data.description}
                                        onChange={(e) =>
                                            setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Describe the role, responsibilities, and what success looks like…"
                                        required
                                    />
                                    <FieldErr msg={errors.description} />
                                </div>
                                <div>
                                    <Label>Requirements</Label>
                                    <textarea
                                        className={inp + ' resize-none'}
                                        rows={3}
                                        value={data.requirements}
                                        onChange={(e) =>
                                            setData(
                                                'requirements',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="3+ years React experience, TypeScript, etc."
                                    />
                                    <FieldErr msg={errors.requirements} />
                                </div>
                                <div>
                                    <Label>Tags</Label>
                                    <TagsField
                                        tags={data.tags}
                                        onChange={(tags) =>
                                            setData('tags', tags)
                                        }
                                    />
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Add skills, perks or seniority to help
                                        candidates filter and improve matching.
                                        Press Enter or comma to add.
                                    </p>
                                    <FieldErr
                                        msg={
                                            (errors as Record<string, string>)
                                                .tags
                                        }
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Location</Label>
                                        <input
                                            className={inp2col}
                                            value={data.location}
                                            onChange={(e) =>
                                                setData(
                                                    'location',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Addis Ababa, Ethiopia"
                                        />
                                        <FieldErr msg={errors.location} />
                                    </div>
                                    <div>
                                        <Label>
                                            Application Deadline{' '}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </Label>
                                        <input
                                            type="date"
                                            className={inp2col}
                                            value={data.application_deadline}
                                            min={
                                                new Date(Date.now() + 86400000)
                                                    .toISOString()
                                                    .split('T')[0]
                                            }
                                            onChange={(e) =>
                                                setData(
                                                    'application_deadline',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            The job automatically closes after
                                            this date.
                                        </p>
                                        <FieldErr
                                            msg={errors.application_deadline}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Salary Min (BIRR)</Label>
                                        <input
                                            type="number"
                                            className={inp2col}
                                            value={data.salary_min}
                                            onChange={(e) =>
                                                setData(
                                                    'salary_min',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="30000"
                                            min={0}
                                        />
                                        <FieldErr msg={errors.salary_min} />
                                    </div>
                                    <div>
                                        <Label>Salary Max (BIRR)</Label>
                                        <input
                                            type="number"
                                            className={inp2col}
                                            value={data.salary_max}
                                            onChange={(e) =>
                                                setData(
                                                    'salary_max',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="60000"
                                            min={0}
                                        />
                                        <FieldErr msg={errors.salary_max} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>
                                            Employment Type{' '}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </Label>
                                        <select
                                            className={
                                                inp2col + ' cursor-pointer'
                                            }
                                            value={data.employment_type}
                                            onChange={(e) =>
                                                setData(
                                                    'employment_type',
                                                    e.target
                                                        .value as EmploymentType,
                                                )
                                            }
                                        >
                                            <option value="full_time">
                                                Full-time
                                            </option>
                                            <option value="part_time">
                                                Part-time
                                            </option>
                                            <option value="contract">
                                                Contract
                                            </option>
                                            <option value="temporary">
                                                Temporary
                                            </option>
                                            <option value="internship">
                                                Internship
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>
                                            Work Type{' '}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </Label>
                                        <select
                                            className={
                                                inp2col + ' cursor-pointer'
                                            }
                                            value={data.work_type}
                                            onChange={(e) =>
                                                setData(
                                                    'work_type',
                                                    e.target.value as WorkType,
                                                )
                                            }
                                        >
                                            <option value="on_site">
                                                On-site
                                            </option>
                                            <option value="remote">
                                                Remote
                                            </option>
                                            <option value="hybrid">
                                                Hybrid
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Dialog Footer */}
                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-8 py-5">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white"
                        >
                            {isView ? 'Close' : 'Cancel'}
                        </button>

                        {!isView && (
                            <button
                                type="submit"
                                form="job-form"
                                disabled={processing}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing && (
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
                                )}
                                {processing
                                    ? 'Saving…'
                                    : isCreate
                                      ? 'Post Job'
                                      : 'Save Changes'}
                            </button>
                        )}

                        {isView && vacancy && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (
                                            confirm('Delete this job posting?')
                                        ) {
                                            router.delete(
                                                `/employer/jobs/${vacancy.id}`,
                                                { onSuccess: onClose },
                                            );
                                        }
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                                >
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"
                                        />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({
    vacancies,
    hiringStats,
}: {
    vacancies: Vacancy[];
    hiringStats?: HiringStats;
}) {
    const active = vacancies.filter((v) => !v.is_expired).length;

    return (
        <div className="mb-6 grid grid-cols-4 gap-4">
            {[
                {
                    label: 'Total Postings',
                    value: vacancies.length,
                    color: 'text-slate-800',
                    bg: 'bg-white',
                },
                {
                    label: 'Active',
                    value: active,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                },
                {
                    label: 'Total Hires',
                    value: hiringStats?.total_hires ?? 0,
                    color: 'text-violet-600',
                    bg: 'bg-violet-50',
                },
                {
                    label: 'Hire Rate',
                    value: `${hiringStats?.hire_rate ?? 0}%`,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                },
            ].map((s) => (
                <div
                    key={s.label}
                    className={`${s.bg} rounded-2xl border border-slate-200 px-5 py-4`}
                >
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="mt-0.5 text-[12px] text-slate-400">
                        {s.label}
                    </p>
                </div>
            ))}
        </div>
    );
}

// ─── Job Row Card ─────────────────────────────────────────────────────────────

function JobRow({
    vacancy,
    onView,
    onEdit,
    onDelete,
}: {
    vacancy: Vacancy;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const deadline = vacancy.application_deadline
        ? daysUntil(vacancy.application_deadline)
        : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired =
        vacancy.is_expired ?? (deadline !== null && deadline < 0);
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);

    return (
        <div
            className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all duration-150 hover:border-slate-300 hover:shadow-sm"
            onClick={onView}
        >
            <div
                className={`h-12 w-1 shrink-0 rounded-full ${!isExpired ? 'bg-emerald-400' : 'bg-slate-200'}`}
            />
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-[14px] font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                        {vacancy.title}
                    </h3>
                    <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${!isExpired ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-100 text-slate-400'}`}
                    >
                        {deadlineLabel(deadline, isExpired)}
                    </span>
                    {(vacancy.hires_count ?? 0) > 0 && (
                        <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                            {vacancy.hires_count} hired
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {vacancy.location && (
                        <span className="flex items-center gap-1 text-[12px] text-slate-400">
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
                        </span>
                    )}
                    <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${WORK_TYPE_COLORS[vacancy.work_type]}`}
                    >
                        {WORK_TYPE_LABELS[vacancy.work_type]}
                    </span>
                    <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}
                    >
                        {EMPLOYMENT_LABELS[vacancy.employment_type]}
                    </span>
                </div>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[13px] font-semibold text-slate-800">
                    {salary}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                    {timeAgo(vacancy.created_at)}
                </p>
            </div>
            <div className="hidden w-24 shrink-0 text-right md:block">
                {vacancy.application_deadline ? (
                    <p
                        className={`text-[12px] font-medium ${isUrgent ? 'text-red-500' : isExpired ? 'text-slate-400 line-through' : 'text-slate-600'}`}
                    >
                        {isExpired
                            ? 'Expired'
                            : deadline === 0
                              ? 'Closes today'
                              : deadline === 1
                                ? '1 day left'
                                : `${deadline} days left`}
                    </p>
                ) : (
                    <p className="text-[12px] text-slate-300">No deadline</p>
                )}
            </div>
            <div
                className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onEdit}
                    title="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                    <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            strokeLinecap="round"
                            d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"
                        />
                    </svg>
                </button>
                <button
                    onClick={onDelete}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                    <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            strokeLinecap="round"
                            d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'active' | 'expired';

export default function EmployerJobsIndex({ vacancies, hiring_stats }: Props) {
    const [dialog, setDialog] = useState<{
        mode: DialogMode;
        vacancy?: Vacancy;
    } | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [search, setSearch] = useState('');

    function closeDialog() {
        setDialog(null);
    }

    function confirmDelete(vacancy: Vacancy) {
        if (confirm(`Delete "${vacancy.title}"? This cannot be undone.`)) {
            router.delete(`/employer/jobs/${vacancy.id}`);
        }
    }

    const filtered = vacancies.filter((v) => {
        const expired = v.is_expired ?? false;
        if (filterStatus === 'active' && expired) return false;
        if (filterStatus === 'expired' && !expired) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                v.title.toLowerCase().includes(q) ||
                (v.location ?? '').toLowerCase().includes(q) ||
                (v.tags ?? []).some((t) => t.toLowerCase().includes(q))
            );
        }
        return true;
    });

    return (
        <AppLayout>
            <Head title="My Job Postings" />
            <style>{`
                @keyframes dialog-in {
                    from { transform: scale(0.96) translateY(8px); opacity: 0; }
                    to   { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-dialog-in { animation: dialog-in 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>

            <div className="mx-auto max-w-5xl px-6 py-8">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Job Postings
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-400">
                            Manage all your vacancy listings
                        </p>
                    </div>
                    <button
                        onClick={() => setDialog({ mode: 'create' })}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                        </svg>
                        Post a Job
                    </button>
                </div>

                <StatsBar vacancies={vacancies} hiringStats={hiring_stats} />

                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="relative min-w-48 flex-1">
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
                            placeholder="Search by title or location…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition-all outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                    <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                        {(['all', 'active', 'expired'] as FilterStatus[]).map(
                            (s) => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-colors ${filterStatus === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {s === 'all'
                                        ? 'All Jobs'
                                        : s === 'active'
                                          ? 'Active Jobs'
                                          : 'Expired Jobs'}
                                </button>
                            ),
                        )}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                            <svg
                                className="h-8 w-8 text-slate-300"
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
                        </div>
                        <p className="font-semibold text-slate-600">
                            {vacancies.length === 0
                                ? 'No job postings yet'
                                : 'No results match your filters'}
                        </p>
                        <p className="mt-1 mb-5 text-sm text-slate-400">
                            {vacancies.length === 0
                                ? 'Click "Post a Job" to create your first vacancy'
                                : 'Try adjusting your search or filter'}
                        </p>
                        {vacancies.length === 0 && (
                            <button
                                onClick={() => setDialog({ mode: 'create' })}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                                <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                >
                                    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                                </svg>
                                Post your first job
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <div
                            className="mb-1 grid px-5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase"
                            style={{
                                gridTemplateColumns: 'auto 1fr 120px 96px 80px',
                            }}
                        >
                            <div className="mr-4 w-3" />
                            <div>Job</div>
                            <div className="hidden text-right sm:block">
                                Salary
                            </div>
                            <div className="hidden text-right md:block">
                                Days remaining
                            </div>
                            <div />
                        </div>
                        {filtered.map((v) => (
                            <JobRow
                                key={v.id}
                                vacancy={v}
                                onView={() =>
                                    setDialog({ mode: 'view', vacancy: v })
                                }
                                onEdit={() =>
                                    setDialog({ mode: 'edit', vacancy: v })
                                }
                                onDelete={() => confirmDelete(v)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {dialog && (
                <JobDialog
                    mode={dialog.mode}
                    vacancy={dialog.vacancy}
                    onClose={closeDialog}
                />
            )}
        </AppLayout>
    );
}
