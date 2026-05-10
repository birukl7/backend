import { useState } from "react";
import { usePage, useForm, router } from "@inertiajs/react";

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
    employment_type: "full_time" | "part_time" | "contract" | "temporary" | "internship";
    status: "open" | "closed";
    work_type: "remote" | "on_site" | "hybrid";
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
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<Vacancy["employment_type"], string> = {
    full_time: "Full-time", part_time: "Part-time", contract: "Contract",
    temporary: "Temporary", internship: "Internship",
};
const WORK_TYPE_LABELS: Record<Vacancy["work_type"], string> = {
    remote: "Remote", on_site: "On-site", hybrid: "Hybrid",
};
const WORK_TYPE_COLORS: Record<Vacancy["work_type"], string> = {
    remote: "bg-emerald-50 text-emerald-700 border-emerald-200",
    on_site: "bg-slate-100 text-slate-600 border-slate-200",
    hybrid: "bg-violet-50 text-violet-700 border-violet-200",
};
const EMPLOYMENT_COLORS: Record<Vacancy["employment_type"], string> = {
    full_time: "bg-blue-50 text-blue-700 border-blue-200",
    part_time: "bg-amber-50 text-amber-700 border-amber-200",
    contract: "bg-orange-50 text-orange-700 border-orange-200",
    temporary: "bg-pink-50 text-pink-700 border-pink-200",
    internship: "bg-teal-50 text-teal-700 border-teal-200",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(min: string | null, max: string | null): string | null {
    if (!min && !max) return null;
    const fmt = (v: string) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(parseFloat(v));
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
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

type ApplyStep = "select-cv" | "cover-letter" | "confirm";

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
    const [step, setStep] = useState<ApplyStep>(userCvs.length === 0 ? "cover-letter" : "select-cv");
    const [submitted, setSubmitted] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<{
        vacancy_id: number;
        cv_id: number | null;
        cover_letter: string;
    }>({
        vacancy_id: vacancy.id,
        cv_id: defaultCv?.id ?? null,
        cover_letter: "",
    });

    const selectedCv = userCvs.find((c) => c.id === data.cv_id) ?? null;

    const STEPS: ApplyStep[] = userCvs.length > 0
        ? ["select-cv", "cover-letter", "confirm"]
        : ["cover-letter", "confirm"];

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
        post("/applications", {
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-40" onClick={onClose} />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center animate-dialog-in">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                            <svg className="w-10 h-10 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Sent!</h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-2">
                            Your application for <span className="font-semibold text-slate-700">{vacancy.title}</span> has been submitted.
                        </p>
                        <p className="text-slate-400 text-xs mb-8">The employer will review your profile and reach out if there's a match.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.visit("/my-applications")}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                My Applications
                            </button>
                            <button
                                onClick={() => { onSuccess(); onClose(); }}
                                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
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
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden animate-dialog-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="px-8 pt-7 pb-5 border-b border-slate-100">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3.5">
                                {/* Vacancy avatar */}
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                                    {vacancy.title.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 leading-tight">{vacancy.title}</h2>
                                    {vacancy.location && (
                                        <p className="text-slate-400 text-[12px] mt-0.5 flex items-center gap-1">
                                            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                                <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z" clipRule="evenodd"/>
                                            </svg>
                                            {vacancy.location}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                                </svg>
                            </button>
                        </div>

                        {/* Step progress */}
                        <div className="flex items-center gap-2">
                            {STEPS.map((s, i) => {
                                const label = s === "select-cv" ? "Resume" : s === "cover-letter" ? "Cover Letter" : "Review";
                                const isActive = i === stepIndex;
                                const isDone = i < stepIndex;
                                return (
                                    <div key={s} className="flex items-center gap-2 flex-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                {isDone ? (
                                                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" d="M2 6l3 3 5-5"/>
                                                    </svg>
                                                ) : i + 1}
                                            </div>
                                            <span className={`text-[12px] font-medium truncate transition-colors ${isActive ? "text-slate-800" : isDone ? "text-emerald-600" : "text-slate-400"}`}>
                                                {label}
                                            </span>
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div className={`h-px flex-1 rounded-full transition-colors ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Body ───────────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">

                        {/* STEP: Select CV */}
                        {step === "select-cv" && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">Choose your resume</h3>
                                    <p className="text-slate-400 text-[13px]">Select which CV to send with your application</p>
                                </div>

                                {userCvs.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                        <div className="w-14 h-14 mx-auto mb-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center">
                                            <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                                            </svg>
                                        </div>
                                        <p className="text-slate-600 font-semibold text-sm mb-1">No CVs found</p>
                                        <p className="text-slate-400 text-[13px] mb-5">You need to create a CV before applying</p>
                                        <a
                                            href="/cv/create"
                                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                                            </svg>
                                            Create a CV
                                        </a>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {userCvs.map((cv) => {
                                            const isSelected = data.cv_id === cv.id;
                                            return (
                                                <button
                                                    key={cv.id}
                                                    type="button"
                                                    onClick={() => setData("cv_id", cv.id)}
                                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                                                        isSelected
                                                            ? "border-blue-500 bg-blue-50/60"
                                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    {/* CV icon */}
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[14px] font-semibold leading-tight ${isSelected ? "text-blue-700" : "text-slate-800"}`}>{cv.title}</p>
                                                        {cv.full_name && <p className="text-[12px] text-slate-400 mt-0.5">{cv.full_name}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {cv.is_default && (
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                                                                DEFAULT
                                                            </span>
                                                        )}
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                                                            {isSelected && (
                                                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                    <path strokeLinecap="round" d="M2 6l3 3 5-5"/>
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        <a
                                            href="/cv"
                                            className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                                                <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                                                </svg>
                                            </div>
                                            <span className="text-[13px] font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Create a new CV</span>
                                        </a>
                                    </div>
                                )}

                                {errors.cv_id && <p className="text-red-500 text-[12px]">{errors.cv_id}</p>}
                            </div>
                        )}

                        {/* STEP: Cover Letter */}
                        {step === "cover-letter" && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">Write your cover letter</h3>
                                    <p className="text-slate-400 text-[13px]">
                                        Optional but strongly recommended — this is your chance to stand out.
                                    </p>
                                </div>

                                {/* Selected CV chip */}
                                {selectedCv && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl w-fit">
                                        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5"/>
                                        </svg>
                                        <span className="text-[12px] font-semibold text-blue-700">{selectedCv.title}</span>
                                    </div>
                                )}

                                {/* Textarea */}
                                <div className="relative">
                                    <textarea
                                        className="w-full px-4 py-3.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none placeholder:text-slate-300 leading-relaxed"
                                        rows={12}
                                        placeholder={COVER_LETTER_PLACEHOLDER}
                                        value={data.cover_letter}
                                        onChange={(e) => setData("cover_letter", e.target.value)}
                                    />
                                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                        <span className={`text-[11px] font-medium transition-colors ${data.cover_letter.length > 4500 ? "text-red-400" : "text-slate-300"}`}>
                                            {data.cover_letter.length}/5000
                                        </span>
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 space-y-1.5">
                                    <p className="text-[12px] font-bold text-amber-700 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z"/>
                                        </svg>
                                        Tips for a great cover letter
                                    </p>
                                    {[
                                        "Mention the specific role and what drew you to it",
                                        "Highlight 1-2 concrete achievements relevant to the job",
                                        "Show you've researched the company",
                                    ].map((tip) => (
                                        <p key={tip} className="text-[12px] text-amber-600 flex items-start gap-1.5 pl-1">
                                            <span className="mt-0.5 shrink-0">·</span> {tip}
                                        </p>
                                    ))}
                                </div>

                                {errors.cover_letter && <p className="text-red-500 text-[12px]">{errors.cover_letter}</p>}
                            </div>
                        )}

                        {/* STEP: Confirm / Review */}
                        {step === "confirm" && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">Review your application</h3>
                                    <p className="text-slate-400 text-[13px]">Everything look good? Hit submit to send.</p>
                                </div>

                                {/* Job summary card */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {vacancy.title.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-[14px]">{vacancy.title}</p>
                                        {vacancy.location && <p className="text-slate-400 text-[12px] mt-0.5">📍 {vacancy.location}</p>}
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>{WORK_TYPE_LABELS[vacancy.work_type]}</span>
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>{EMPLOYMENT_LABELS[vacancy.employment_type]}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Resume used */}
                                <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl">
                                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                                        <svg className="w-4.5 h-4.5 text-white w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">Resume</p>
                                        <p className="text-[13px] font-semibold text-slate-800">{selectedCv?.title ?? "None selected"}</p>
                                    </div>
                                </div>

                                {/* Cover letter preview */}
                                <div className="px-4 py-4 bg-white border border-slate-200 rounded-2xl">
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Cover Letter</p>
                                    {data.cover_letter.trim() ? (
                                        <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line line-clamp-5">{data.cover_letter}</p>
                                    ) : (
                                        <p className="text-[13px] text-slate-300 italic">No cover letter — applying without one.</p>
                                    )}
                                </div>

                                {errors.apply && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-[13px]">
                                        {errors.apply}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ─────────────────────────────────────────────── */}
                    <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <button
                            onClick={stepIndex > 0 ? goBack : onClose}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            {stepIndex > 0 ? (
                                <>
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                        <path fillRule="evenodd" d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd"/>
                                    </svg>
                                    Back
                                </>
                            ) : "Cancel"}
                        </button>

                        <div className="flex items-center gap-3">
                            {/* Step dots */}
                            <div className="flex gap-1.5">
                                {STEPS.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-5 bg-blue-500" : i < stepIndex ? "w-1.5 bg-emerald-400" : "w-1.5 bg-slate-200"}`} />
                                ))}
                            </div>

                            {step !== "confirm" ? (
                                <button
                                    onClick={goNext}
                                    disabled={step === "select-cv" && data.cv_id === null}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                                >
                                    Continue
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                        <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06-1.06L9.44 7.5 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd"/>
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={submit}
                                    disabled={processing || data.cv_id === null}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                            </svg>
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            Submit Application
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M1.5 2.5l13 5.5-13 5.5V9l9-1-9-1V2.5z"/>
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
    const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <aside className="w-60 shrink-0 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-12 bg-gradient-to-r from-blue-500 to-blue-600" />
                <div className="px-4 pb-4">
                    <div className="relative -mt-6 mb-3">
                        {user.profile_photo_url ? (
                            <img src={user.profile_photo_url} alt={user.name} className="w-12 h-12 rounded-full border-[3px] border-white object-cover shadow" />
                        ) : (
                            <div className="w-12 h-12 rounded-full border-[3px] border-white bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow">{initials}</div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                    </div>
                    <h2 className="font-semibold text-slate-900 text-[14px] leading-tight">{user.name}</h2>
                    <p className="text-slate-400 text-[12px] mt-0.5 truncate">{user.email}</p>
                    <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-500 underline underline-offset-2 cursor-pointer hover:text-slate-700 transition-colors">Complete your profile</span>
                            <span className="text-[11px] font-bold text-blue-600">100%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-blue-500 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 grid grid-cols-2 gap-2">
                {[{ label: "Applied", value: "12" }, { label: "Saved", value: "5" }, { label: "Interviews", value: "2" }, { label: "Offers", value: "1" }].map((s) => (
                    <div key={s.label} className="text-center bg-slate-50 rounded-xl py-2">
                        <p className="text-lg font-bold text-slate-800">{s.value}</p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {[
                    { icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9.5a2 2 0 100-4 2 2 0 000 4zM13.5 8a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/></svg>, label: "Manage Profile", sub: "Update your info", href: "/profile", color: "text-blue-600 bg-blue-50" },
                    { icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 1.5l1.75 3.5 3.75.5-2.75 2.75.75 3.75L8 10l-3.5 2 .75-3.75L2.5 5.5l3.75-.5L8 1.5z"/></svg>, label: "Skill Score", sub: "View your ratings", href: "/skills", color: "text-amber-600 bg-amber-50" },
                    { icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M1.5 2.5h13v9h-13zM5.5 11.5v2M10.5 11.5v2M3.5 13.5h9"/></svg>, label: "Take a Quiz", sub: "Earn certifications", href: "/quiz", color: "text-emerald-600 bg-emerald-50" },
                    { icon: <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h12M2 8h12M2 4h8"/></svg>, label: "My Applications", sub: "Track your progress", href: "/my-applications", color: "text-violet-600 bg-violet-50" },
                ].map((item) => (
                    <a key={item.label} href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>{item.icon}</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-slate-800 leading-tight">{item.label}</p>
                            <p className="text-[11px] text-slate-400">{item.sub}</p>
                        </div>
                        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd"/>
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
    const deadline = vacancy.application_deadline ? daysUntil(vacancy.application_deadline) : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;

    return (
        <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <span className="text-[13px] font-medium text-slate-400">Job Details</span>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <div>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-base shrink-0">
                                {vacancy.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 leading-snug">{vacancy.title}</h2>
                                {vacancy.location && (
                                    <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z" clipRule="evenodd"/>
                                        </svg>
                                        {vacancy.location}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className={`text-[12px] font-medium px-3 py-1 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>{WORK_TYPE_LABELS[vacancy.work_type]}</span>
                            <span className={`text-[12px] font-medium px-3 py-1 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>{EMPLOYMENT_LABELS[vacancy.employment_type]}</span>
                            <span className={`text-[12px] font-medium px-3 py-1 rounded-full border ${vacancy.status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                {vacancy.status === "open" ? "● Open" : "Closed"}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Salary", value: salary ?? "Not specified" },
                            { label: "Posted", value: timeAgo(vacancy.created_at) },
                            { label: "Deadline", value: vacancy.application_deadline ? new Date(vacancy.application_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No deadline", urgent: isUrgent },
                            { label: "Employment", value: EMPLOYMENT_LABELS[vacancy.employment_type] },
                        ].map((item) => (
                            <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p className="text-[11px] text-slate-400 mb-1 uppercase tracking-wide">{item.label}</p>
                                <p className={`text-[14px] font-semibold ${item.urgent ? "text-red-500" : "text-slate-800"}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {isUrgent && deadline !== null && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3.25a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                            </svg>
                            <p className="text-red-600 text-[13px] font-medium">
                                {deadline === 0 ? "Closes today — apply now!" : `Only ${deadline} day${deadline === 1 ? "" : "s"} left to apply`}
                            </p>
                        </div>
                    )}

                    <div>
                        <h3 className="text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">About the Role</h3>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{vacancy.description}</p>
                    </div>

                    {vacancy.requirements && (
                        <div>
                            <h3 className="text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">Requirements</h3>
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{vacancy.requirements}</p>
                        </div>
                    )}
                </div>

                {/* Sticky footer with Apply button */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3">
                    {hasApplied ? (
                        <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm py-3 rounded-xl">
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M2 8l4 4 8-8"/>
                            </svg>
                            Already Applied
                        </div>
                    ) : vacancy.status !== "open" ? (
                        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-400 font-semibold text-sm py-3 rounded-xl">
                            Applications Closed
                        </div>
                    ) : (
                        <button
                            onClick={onApply}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Apply Now
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M1.5 2.5l13 5.5-13 5.5V9l9-1-9-1V2.5z"/>
                            </svg>
                        </button>
                    )}
                    <button className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 2.5h11v12l-5.5-3-5.5 3z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ vacancy, hasApplied, onClick }: { vacancy: Vacancy; hasApplied: boolean; onClick: () => void }) {
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline ? daysUntil(vacancy.application_deadline) : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired = deadline !== null && deadline < 0;

    return (
        <div onClick={onClick} className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0 border border-slate-200">
                        {vacancy.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-[15px] leading-snug truncate group-hover:text-blue-600 transition-colors">{vacancy.title}</h3>
                        {vacancy.location && (
                            <p className="text-slate-400 text-[12px] mt-0.5 flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z" clipRule="evenodd"/></svg>
                                {vacancy.location}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {hasApplied && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M2 6l3 3 5-5"/></svg>
                            Applied
                        </span>
                    )}
                    {vacancy.status === "open" && !isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Open
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Closed</span>
                    )}
                </div>
            </div>

            <p className="text-slate-500 text-[13px] leading-relaxed line-clamp-2 mb-3">{vacancy.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>{WORK_TYPE_LABELS[vacancy.work_type]}</span>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>{EMPLOYMENT_LABELS[vacancy.employment_type]}</span>
                {vacancy.requirements && (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200 truncate max-w-[160px]">{vacancy.requirements}</span>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                    {salary ? <span className="text-slate-800 font-semibold text-[13px]">{salary}</span> : <span className="text-slate-400 text-[13px]">Salary not listed</span>}
                </div>
                <div className="flex items-center gap-3">
                    {isUrgent && <span className="text-[11px] font-medium text-red-500">{deadline === 0 ? "Closes today" : `${deadline}d left`}</span>}
                    <span className="text-slate-400 text-[12px]">{timeAgo(vacancy.created_at)}</span>
                    <span className="text-[12px] font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">View →</span>
                </div>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FilterWorkType = "all" | Vacancy["work_type"];
type FilterEmployment = "all" | Vacancy["employment_type"];

export default function JobListings({ vacancies, applied_ids = [], user_cvs = [] }: Props) {
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth.user;

    const [search, setSearch] = useState("");
    const [workType, setWorkType] = useState<FilterWorkType>("all");
    const [employment, setEmployment] = useState<FilterEmployment>("all");
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [selected, setSelected] = useState<Vacancy | null>(null);
    const [applying, setApplying] = useState<Vacancy | null>(null);

    // Track applied IDs locally so the UI updates after submission without a full page reload
    const [localAppliedIds, setLocalAppliedIds] = useState<number[]>(applied_ids);

    const filtered = vacancies.filter((v) => {
        if (showOpenOnly && v.status !== "open") return false;
        if (workType !== "all" && v.work_type !== workType) return false;
        if (employment !== "all" && v.employment_type !== employment) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || (v.location ?? "").toLowerCase().includes(q);
        }
        return true;
    });

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

            <div className="flex gap-5 px-6 py-6 w-full min-h-0">
                <ProfileSidebar user={user} />

                <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Job Board</h1>
                            <p className="text-slate-400 text-sm mt-0.5">{filtered.length} {filtered.length === 1 ? "position" : "positions"} available</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 5.5a4.5 4.5 0 117.91 2.912l2.718 2.719a.75.75 0 01-1.06 1.06L7.85 9.473A4.5 4.5 0 011 5.5z" clipRule="evenodd" fillRule="evenodd"/>
                            </svg>
                            <input type="text" placeholder="Search by title, skill, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select value={workType} onChange={(e) => setWorkType(e.target.value as FilterWorkType)} className="text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
                                <option value="all">All work types</option>
                                <option value="remote">Remote</option>
                                <option value="hybrid">Hybrid</option>
                                <option value="on_site">On-site</option>
                            </select>
                            <select value={employment} onChange={(e) => setEmployment(e.target.value as FilterEmployment)} className="text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
                                <option value="all">All job types</option>
                                <option value="full_time">Full-time</option>
                                <option value="part_time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="temporary">Temporary</option>
                                <option value="internship">Internship</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer ml-auto">
                                <div onClick={() => setShowOpenOnly(!showOpenOnly)} className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${showOpenOnly ? "bg-blue-500" : "bg-slate-200"}`}>
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showOpenOnly ? "translate-x-4" : ""}`} />
                                </div>
                                <span className="text-[13px] text-slate-600 select-none">Open only</span>
                            </label>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                            </svg>
                            <p className="font-medium text-slate-500">No jobs match your filters</p>
                            <p className="text-sm mt-1">Try adjusting your search or clearing some filters</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filtered.map((v) => (
                                <JobCard key={v.id} vacancy={v} hasApplied={localAppliedIds.includes(v.id)} onClick={() => setSelected(v)} />
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