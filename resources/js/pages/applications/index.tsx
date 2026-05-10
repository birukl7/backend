import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";

interface Application {
    id: number;
    status: "pending" | "applied" | "shortlisted" | "rejected" | "hired";
    cover_letter: string | null;
    created_at: string;
    vacancy: {
        id: number;
        title: string;
        location: string | null;
        work_type: "remote" | "on_site" | "hybrid";
        employment_type: string;
        status: "open" | "closed";
    };
    cv: {
        id: number;
        title: string;
    };
}

interface Props {
    applications: Application[];
}

const STATUS_CONFIG: Record<Application["status"], { label: string; color: string; dot: string }> = {
    pending:     { label: "Pending",     color: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400" },
    applied:     { label: "Applied",     color: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-400" },
    shortlisted: { label: "Shortlisted", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
    rejected:    { label: "Rejected",    color: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-400" },
    hired:       { label: "Hired 🎉",    color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

const WORK_TYPE_LABELS: Record<string, string> = { remote: "Remote", on_site: "On-site", hybrid: "Hybrid" };

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function StatsRow({ applications }: { applications: Application[] }) {
    const counts = {
        total: applications.length,
        shortlisted: applications.filter((a) => a.status === "shortlisted").length,
        hired: applications.filter((a) => a.status === "hired").length,
        pending: applications.filter((a) => ["pending", "applied"].includes(a.status)).length,
    };

    return (
        <div className="grid grid-cols-4 gap-3 mb-6">
            {[
                { label: "Total", value: counts.total, color: "text-slate-800", bg: "bg-white" },
                { label: "In Review", value: counts.pending, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Shortlisted", value: counts.shortlisted, color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Hired", value: counts.hired, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map((s) => (
                <div key={s.label} className={`${s.bg} border border-slate-200 rounded-2xl px-5 py-4`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
            ))}
        </div>
    );
}

export default function MyApplications({ applications }: Props) {
    function withdraw(id: number) {
        if (confirm("Withdraw this application?")) {
            router.delete(`/applications/${id}`);
        }
    }

    return (
        <AppLayout>
            <Head title="My Applications" />

            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Applications</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Track the status of every job you've applied to</p>
                </div>

                {applications.length > 0 && <StatsRow applications={applications} />}

                {applications.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5"/>
                            </svg>
                        </div>
                        <p className="font-semibold text-slate-600 mb-1">No applications yet</p>
                        <p className="text-slate-400 text-sm mb-5">Start applying to jobs to track them here</p>
                        <a href="/jobs" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                            Browse Jobs
                        </a>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {applications.map((app) => {
                            const cfg = STATUS_CONFIG[app.status];
                            const canWithdraw = ["pending", "applied"].includes(app.status);

                            return (
                                <div key={app.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl px-5 py-4 flex items-start gap-4 transition-colors group">
                                    {/* Color strip */}
                                    <div className={`w-1 h-12 rounded-full shrink-0 mt-0.5 ${cfg.dot}`} />

                                    {/* Main */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <a href={`/jobs`} className="font-semibold text-slate-900 text-[14px] hover:text-blue-600 transition-colors leading-snug">
                                                    {app.vacancy.title}
                                                </a>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                    {app.vacancy.location && (
                                                        <span className="text-[12px] text-slate-400 flex items-center gap-1">
                                                            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                                                <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z" clipRule="evenodd"/>
                                                            </svg>
                                                            {app.vacancy.location}
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] text-slate-400">{WORK_TYPE_LABELS[app.vacancy.work_type]}</span>
                                                    <span className="text-[11px] text-slate-300">·</span>
                                                    <span className="text-[11px] text-slate-400">via <span className="font-medium text-slate-600">{app.cv.title}</span></span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Cover letter preview */}
                                        {app.cover_letter && (
                                            <p className="text-slate-400 text-[12px] mt-2 line-clamp-1 italic">
                                                "{app.cover_letter.trim().slice(0, 120)}{app.cover_letter.length > 120 ? "…" : ""}"
                                            </p>
                                        )}

                                        {/* Bottom row */}
                                        <div className="flex items-center justify-between mt-2.5">
                                            <span className="text-[11px] text-slate-400">Applied {timeAgo(app.created_at)}</span>
                                            {canWithdraw && (
                                                <button
                                                    onClick={() => withdraw(app.id)}
                                                    className="text-[11px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:underline"
                                                >
                                                    Withdraw
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}