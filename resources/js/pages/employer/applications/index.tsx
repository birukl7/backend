import AppLayout from "@/layouts/app-layout";
import { Head, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import ScreeningReport, { ScreeningResponseData } from "@/components/screening-report";
import EmployerCvBrief from "@/components/employer-cv-brief";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStatus = "pending" | "applied" | "shortlisted" | "rejected" | "hired";

interface CvExperience {
    id: number; job_title: string; company_name: string; location: string | null;
    description: string | null; start_date: string; end_date: string | null; is_current: boolean;
}
interface CvEducation {
    id: number; institution_name: string; degree: string; field_of_study: string;
    start_date: string; end_date: string | null; is_current: boolean;
}
interface CvSkill { id: number; skill_name: string; proficiency_level: string; category: string | null; }
interface CvProject { id: number; project_name: string; description: string | null; url: string | null; tech_stack: string | null; }

interface Cv {
    id: number; title: string; full_name: string | null; email: string | null;
    phone: string | null; location: string | null; summary: string | null;
    experiences: CvExperience[]; educations: CvEducation[];
    skills: CvSkill[]; projects: CvProject[];
}

interface Interview {
    id: number; scheduled_at: string; status: string; notes: string | null; meeting_link: string;
}

interface Application {
    id: number; status: AppStatus; cover_letter: string | null; created_at: string;
    vacancy: { id: number; title: string; location: string | null; work_type: string; employment_type: string; };
    user: { id: number; name: string; email: string; };
    cv: Cv;
    interview: Interview | null;
    screening_response?: ScreeningResponseData | null;
}

interface Props { applications: Application[]; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today"; if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`; if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}
function fmtDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const STATUS_CFG: Record<AppStatus, { label: string; color: string; dot: string }> = {
    pending:     { label: "Pending",     color: "bg-amber-50 text-amber-700 border-amber-200",    dot: "bg-amber-400" },
    applied:     { label: "Applied",     color: "bg-blue-50 text-blue-700 border-blue-200",       dot: "bg-blue-400" },
    shortlisted: { label: "Shortlisted", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
    rejected:    { label: "Rejected",    color: "bg-red-50 text-red-500 border-red-200",          dot: "bg-red-400" },
    hired:       { label: "Hired 🎉",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

const inp = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300";

// ─── CV Preview Drawer ────────────────────────────────────────────────────────

function CvPreviewDrawer({ app, onClose, onSchedule, onReschedule }: {
    app: Application;
    onClose: () => void;
    onSchedule: () => void;
    onReschedule: () => void;
}) {
    const cv = app.cv;
    const accent = "#2563eb";

    return (
        <>
            <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-[560px] max-w-full bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {app.user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-slate-900">{app.user.name}</p>
                            <p className="text-[12px] text-slate-400">{app.user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                        </svg>
                    </button>
                </div>

                {/* Scrollable CV */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* AI brief — always available */}
                    <div className="mb-5">
                        <EmployerCvBrief applicationId={app.id} />
                    </div>

                    {app.screening_response && (
                        <div className="mb-5">
                            <ScreeningReport response={app.screening_response} />
                        </div>
                    )}

                    {app.cover_letter && (
                        <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2">Cover Letter</p>
                            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">{app.cover_letter}</p>
                        </div>
                    )}

                    {/* Interview banner (when already scheduled) */}
                    {app.interview && (
                        <div className="mb-5 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                            <svg className="w-5 h-5 text-violet-500 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                                <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                            </svg>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-violet-700">Interview Scheduled</p>
                                <p className="text-[11px] text-violet-500 mt-0.5 truncate">
                                    {new Date(app.interview.scheduled_at).toLocaleString("en-US", {
                                        weekday: "short", month: "short", day: "numeric",
                                        hour: "numeric", minute: "2-digit",
                                    })}
                                    {" · "}
                                    <span className="capitalize">{app.interview.status}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => { onClose(); onReschedule(); }}
                                className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 bg-white border border-violet-200 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                            >
                                Reschedule
                            </button>
                        </div>
                    )}

                    {/* CV Document */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden text-[11px] leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>
                        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `3px solid ${accent}` }}>
                            <h1 className="text-2xl font-bold text-slate-900">{cv.full_name || app.user.name}</h1>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-slate-500 text-[10px]">
                                {(cv.email || app.user.email) && <span>✉ {cv.email || app.user.email}</span>}
                                {cv.phone && <span>📞 {cv.phone}</span>}
                                {cv.location && <span>📍 {cv.location}</span>}
                            </div>
                            {cv.summary && <p className="mt-3 text-slate-600 text-[11px] leading-relaxed">{cv.summary}</p>}
                        </div>

                        <div className="px-6 py-4 space-y-5">
                            {cv.experiences?.length > 0 && (
                                <div>
                                    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Experience</h2>
                                    <div className="space-y-3">
                                        {cv.experiences.map(exp => (
                                            <div key={exp.id}>
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-bold text-slate-800 text-[12px]">{exp.job_title}</p>
                                                    <p className="text-slate-400 text-[10px] shrink-0 ml-2">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p>
                                                </div>
                                                <p className="text-slate-500 text-[10px]">{exp.company_name}{exp.location ? ` · ${exp.location}` : ""}</p>
                                                {exp.description && <p className="text-slate-600 mt-1 text-[10px]">{exp.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {cv.educations?.length > 0 && (
                                <div>
                                    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Education</h2>
                                    <div className="space-y-2">
                                        {cv.educations.map(edu => (
                                            <div key={edu.id}>
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-bold text-slate-800 text-[12px]">{edu.degree} in {edu.field_of_study}</p>
                                                    <p className="text-slate-400 text-[10px] shrink-0 ml-2">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p>
                                                </div>
                                                <p className="text-slate-500 text-[10px]">{edu.institution_name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {cv.skills?.length > 0 && (
                                <div>
                                    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Skills</h2>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cv.skills.map(s => (
                                            <span key={s.id} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{s.skill_name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {cv.projects?.length > 0 && (
                                <div>
                                    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Projects</h2>
                                    <div className="space-y-2">
                                        {cv.projects.map(p => (
                                            <div key={p.id}>
                                                <p className="font-bold text-slate-800 text-[12px]">{p.project_name}</p>
                                                {p.tech_stack && <p className="text-slate-400 text-[10px]">{p.tech_stack}</p>}
                                                {p.description && <p className="text-slate-600 text-[10px] mt-0.5">{p.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sticky footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                    {app.status !== "rejected" && app.status !== "hired" && (
                        <button
                            onClick={() => { router.patch(`/employer/applications/${app.id}/status`, { status: "rejected" }); onClose(); }}
                            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8"/></svg>
                            Reject
                        </button>
                    )}
                    {(app.status === "pending" || app.status === "applied") && (
                        <button
                            onClick={() => router.patch(`/employer/applications/${app.id}/status`, { status: "shortlisted" })}
                            className="px-4 py-2.5 rounded-xl border border-violet-200 text-violet-600 hover:bg-violet-50 text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M8 1.5l1.5 4h4l-3.5 2.5 1 4L8 10l-3 2 1-4L2.5 5.5h4z"/></svg>
                            Shortlist
                        </button>
                    )}
                    {app.status === "shortlisted" && (
                        <button
                            onClick={() => router.patch(`/employer/applications/${app.id}/status`, { status: "hired" })}
                            className="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M2 8l4 4 8-8"/></svg>
                            Mark Hired
                        </button>
                    )}

                    {/* Schedule / Reschedule / Join — mutually exclusive */}
                    {!app.interview && app.status !== "rejected" && (
                        <button
                            onClick={() => { onClose(); onSchedule(); }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                                <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                            </svg>
                            Schedule Interview
                        </button>
                    )}
                    {app.interview && app.interview.status === "scheduled" && (
                        <a
                            href={`/interviews/${app.interview.id}/join`}
                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9.5l-3 2.5V12H3.5A1.5 1.5 0 012 10.5v-7z"/>
                            </svg>
                            Open Interview Room
                        </a>
                    )}
                    {app.interview && app.interview.status !== "scheduled" && (
                        <span className="flex-1 flex items-center justify-center text-[12px] text-slate-400 border border-slate-200 rounded-xl py-2.5 capitalize">
                            Interview {app.interview.status}
                        </span>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Schedule / Reschedule Dialog ─────────────────────────────────────────────

function ScheduleDialog({ app, onClose, reschedule }: {
    app: Application;
    onClose: () => void;
    reschedule?: boolean;
}) {
    const url = reschedule && app.interview
        ? `/employer/interviews/${app.interview.id}/reschedule`
        : `/employer/applications/${app.id}/interview`;

    const { data, setData, post, patch, processing, errors } = useForm({
        scheduled_at: "",
        notes: app.interview?.notes ?? "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fn = reschedule ? patch : post;
        fn(url, { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-50" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-dialog-in" onClick={e => e.stopPropagation()}>
                    <div className="px-7 pt-7 pb-5 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${reschedule ? "bg-amber-500" : "bg-violet-600"}`}>
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                                        <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-slate-900">{reschedule ? "Reschedule Interview" : "Schedule Interview"}</h2>
                                    <p className="text-[12px] text-slate-400">with {app.user.name} — {app.vacancy.title}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                                </svg>
                            </button>
                        </div>

                        {/* Show current time when rescheduling */}
                        {reschedule && app.interview && (
                            <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="8" cy="8" r="6.5"/><path strokeLinecap="round" d="M8 5v3.5l2 1.5"/>
                                </svg>
                                Currently: <strong className="text-slate-700 ml-1">
                                    {new Date(app.interview.scheduled_at).toLocaleString("en-US", {
                                        weekday: "short", month: "short", day: "numeric",
                                        hour: "numeric", minute: "2-digit",
                                    })}
                                </strong>
                            </div>
                        )}
                    </div>

                    <form onSubmit={submit} className="px-7 py-5 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                {reschedule ? "New " : ""}Date & Time <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                className={inp}
                                value={data.scheduled_at}
                                onChange={e => setData("scheduled_at", e.target.value)}
                                required
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            {errors.scheduled_at && <p className="text-red-500 text-[11px] mt-1">{errors.scheduled_at}</p>}
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Timezone</label>
                            <input className={inp} value={data.timezone} onChange={e => setData("timezone", e.target.value)} placeholder="Africa/Addis_Ababa" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes for candidate</label>
                            <textarea
                                className={inp + " resize-none"}
                                rows={3}
                                value={data.notes}
                                onChange={e => setData("notes", e.target.value)}
                                placeholder="What to prepare, topics covered, dress code…"
                            />
                        </div>

                        <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
                            <svg className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9.5l-3 2.5V12H3.5A1.5 1.5 0 012 10.5v-7z"/>
                            </svg>
                            <p className="text-[12px] text-violet-700 leading-relaxed">
                                {reschedule
                                    ? "The existing Jitsi room link will be preserved — no new link is created."
                                    : "A private <strong>Jitsi</strong> video room will be created automatically."
                                }
                            </p>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={processing || !data.scheduled_at}
                                className={`flex-1 py-2.5 rounded-xl disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${reschedule ? "bg-amber-500 hover:bg-amber-600" : "bg-violet-600 hover:bg-violet-700"}`}>
                                {processing && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                                {processing ? (reschedule ? "Saving…" : "Scheduling…") : (reschedule ? "Reschedule" : "Schedule Interview")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

// ─── Application Row ──────────────────────────────────────────────────────────

function ApplicationRow({ app, onViewCv, onSchedule }: {
    app: Application;
    onViewCv: () => void;
    onSchedule: () => void;
}) {
    const cfg = STATUS_CFG[app.status];

    return (
        <div className="group bg-white border border-slate-200 hover:border-slate-300 rounded-2xl px-5 py-4 flex items-center gap-4 transition-all cursor-pointer hover:shadow-sm" onClick={onViewCv}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                {app.user.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{app.user.name}</p>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5">{app.vacancy.title} · Applied {timeAgo(app.created_at)}</p>
            </div>

            {app.screening_response?.ai_score !== null && app.screening_response?.ai_score !== undefined && (
                <div
                    className={`hidden md:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                        app.screening_response.ai_score >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        app.screening_response.ai_score >= 60 ? "bg-blue-50 border-blue-200 text-blue-700" :
                        app.screening_response.ai_score >= 35 ? "bg-amber-50 border-amber-200 text-amber-700" :
                                                                "bg-red-50 border-red-200 text-red-600"
                    }`}
                    title="AI Screening score"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI {app.screening_response.ai_score}/100
                </div>
            )}

            {app.interview && (
                <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-violet-600 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="3" width="12" height="11" rx="1.5"/><path strokeLinecap="round" d="M2 7h12"/>
                    </svg>
                    Interview set
                </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button title="View CV" onClick={onViewCv}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/>
                    </svg>
                </button>
                {!app.interview && app.status !== "rejected" && (
                    <button title="Schedule Interview" onClick={onSchedule}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="12" height="11" rx="1.5"/><path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                        </svg>
                    </button>
                )}
                {app.status !== "rejected" && app.status !== "hired" && (
                    <button title="Reject"
                        onClick={() => router.patch(`/employer/applications/${app.id}/status`, { status: "rejected" })}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8"/>
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ apps }: { apps: Application[] }) {
    return (
        <div className="grid grid-cols-5 gap-3 mb-6">
            {[
                { label: "Total",       value: apps.length,                                                   color: "text-slate-800", bg: "bg-white" },
                { label: "Pending",     value: apps.filter(a => ["pending","applied"].includes(a.status)).length, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Shortlisted", value: apps.filter(a => a.status === "shortlisted").length,           color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Hired",       value: apps.filter(a => a.status === "hired").length,                 color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Rejected",    value: apps.filter(a => a.status === "rejected").length,              color: "text-red-400", bg: "bg-red-50" },
            ].map(s => (
                <div key={s.label} className={`${s.bg} border border-slate-200 rounded-2xl px-4 py-3.5`}>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = "all" | AppStatus;

export default function EmployerApplications({ applications }: Props) {
    const [viewApp, setViewApp] = useState<Application | null>(null);
    const [scheduleApp, setScheduleApp] = useState<Application | null>(null);
    const [rescheduleApp, setRescheduleApp] = useState<Application | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [filterVacancy, setFilterVacancy] = useState("all");
    const [search, setSearch] = useState("");

    const vacancies = Array.from(new Set(applications.map(a => a.vacancy.title)));

    const filtered = applications.filter(a => {
        if (filterStatus !== "all" && a.status !== filterStatus) return false;
        if (filterVacancy !== "all" && a.vacancy.title !== filterVacancy) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return a.user.name.toLowerCase().includes(q) || a.user.email.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <AppLayout>
            <Head title="Applications" />

            <style>{`
                @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes dialog-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.22,1,0.36,1); }
                .animate-dialog-in { animation: dialog-in 0.2s cubic-bezier(0.22,1,0.36,1); }
            `}</style>

            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Applications</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Review candidates across all your job postings</p>
                    </div>
                    <a href="/employer/interviews" className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="12" height="11" rx="1.5"/><path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                        </svg>
                        View Interviews
                    </a>
                </div>

                <StatsBar apps={applications} />

                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-40">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 5.5a4.5 4.5 0 117.91 2.912l2.718 2.719a.75.75 0 01-1.06 1.06L7.85 9.473A4.5 4.5 0 011 5.5z" clipRule="evenodd" fillRule="evenodd"/>
                        </svg>
                        <input type="text" placeholder="Search applicants…" value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400" />
                    </div>
                    <select value={filterVacancy} onChange={e => setFilterVacancy(e.target.value)}
                        className="text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
                        <option value="all">All positions</option>
                        {vacancies.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["all","pending","shortlisted","hired","rejected"] as FilterStatus[]).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors capitalize ${filterStatus === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                {s === "all" ? "All" : s}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                        <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
                            </svg>
                        </div>
                        <p className="font-semibold text-slate-500">No applications {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filtered.map(app => (
                            <ApplicationRow
                                key={app.id}
                                app={app}
                                onViewCv={() => setViewApp(app)}
                                onSchedule={() => setScheduleApp(app)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {viewApp && (
                <CvPreviewDrawer
                    app={viewApp}
                    onClose={() => setViewApp(null)}
                    onSchedule={() => setScheduleApp(viewApp)}
                    onReschedule={() => setRescheduleApp(viewApp)}
                />
            )}
            {scheduleApp && (
                <ScheduleDialog app={scheduleApp} onClose={() => setScheduleApp(null)} />
            )}
            {rescheduleApp && (
                <ScheduleDialog app={rescheduleApp} onClose={() => setRescheduleApp(null)} reschedule />
            )}
        </AppLayout>
    );
}