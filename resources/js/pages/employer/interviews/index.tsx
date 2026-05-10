import AppLayout from "@/layouts/app-layout";
import { Head, router, useForm } from "@inertiajs/react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interview {
    id: number;
    scheduled_at: string;
    rescheduled_at: string | null;
    status: "scheduled" | "completed" | "cancelled";
    notes: string | null;
    timezone: string | null;
    room_id: string;
    meeting_link: string;
    vacancy_title: string;
    vacancy_location: string | null;
    application_id: number;
    candidate_name: string;
    candidate_email: string | null;
}

interface Props {
    interviews: Interview[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtFull(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        year: "numeric", hour: "numeric", minute: "2-digit",
    });
}
function isToday(iso: string) {
    const d = new Date(iso), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isSoon(iso: string) {
    const diff = new Date(iso).getTime() - Date.now();
    return diff > 0 && diff < 30 * 60 * 1000;
}
function isPast(iso: string) {
    return new Date(iso).getTime() < Date.now();
}

const STATUS_STYLES = {
    scheduled: { bg: "bg-violet-50 border-violet-200", text: "text-violet-700", dot: "bg-violet-500", label: "Scheduled" },
    completed:  { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
    cancelled:  { bg: "bg-slate-100 border-slate-200", text: "text-slate-400", dot: "bg-slate-300", label: "Cancelled" },
};

const inp = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300";

// ─── Reschedule Dialog ────────────────────────────────────────────────────────

function RescheduleDialog({ interview, onClose }: { interview: Interview; onClose: () => void }) {
    const { data, setData, patch, processing, errors } = useForm({
        scheduled_at: "",
        notes: interview.notes ?? "",
        timezone: interview.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/employer/interviews/${interview.id}/reschedule`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-50" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-dialog-in" onClick={e => e.stopPropagation()}>
                    <div className="px-7 pt-7 pb-5 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                                        <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-slate-900">Reschedule Interview</h2>
                                    <p className="text-[12px] text-slate-400">with {interview.candidate_name} — {interview.vacancy_title}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                                </svg>
                            </button>
                        </div>

                        {/* Current time reminder */}
                        <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="8" cy="8" r="6.5"/><path strokeLinecap="round" d="M8 5v3.5l2 1.5"/>
                            </svg>
                            Currently set for <strong className="text-slate-700 ml-1">{fmtFull(interview.scheduled_at)}</strong>
                        </div>
                    </div>

                    <form onSubmit={submit} className="px-7 py-5 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                New Date & Time <span className="text-red-400">*</span>
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
                            <input className={inp} value={data.timezone} onChange={e => setData("timezone", e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes for candidate</label>
                            <textarea
                                className={inp + " resize-none"}
                                rows={3}
                                value={data.notes}
                                onChange={e => setData("notes", e.target.value)}
                                placeholder="Updated instructions or preparation notes…"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={processing || !data.scheduled_at}
                                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                                {processing && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                                {processing ? "Saving…" : "Reschedule"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

// ─── Interview Card ───────────────────────────────────────────────────────────

function InterviewCard({ interview, onReschedule }: { interview: Interview; onReschedule: () => void }) {
    const style = STATUS_STYLES[interview.status];
    const soon = isSoon(interview.scheduled_at);
    const today = isToday(interview.scheduled_at);
    const past = isPast(interview.scheduled_at);
    const canAct = interview.status === "scheduled";

    return (
        <div className={`bg-white border rounded-2xl overflow-hidden transition-all
            ${interview.status === "cancelled" ? "opacity-60" : "hover:shadow-sm"}
            ${soon ? "border-violet-300 shadow-md shadow-violet-100" : "border-slate-200"}`}>

            {/* Urgent banner */}
            {soon && (
                <div className="bg-violet-600 text-white text-[12px] font-semibold px-4 py-1.5 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                    </svg>
                    Interview starting soon!
                </div>
            )}

            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {interview.candidate_name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-0.5">
                            <p className="text-[14px] font-bold text-slate-900 truncate">{interview.candidate_name}</p>
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${style.bg} ${style.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {style.label}
                            </span>
                        </div>
                        {interview.candidate_email && (
                            <p className="text-[12px] text-slate-400">{interview.candidate_email}</p>
                        )}
                        <p className="text-[12px] text-blue-600 font-medium mt-0.5">{interview.vacancy_title}</p>
                    </div>
                </div>

                {/* Time row */}
                <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className={`flex items-center gap-2 ${today ? "text-violet-600" : "text-slate-600"}`}>
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                            <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                        </svg>
                        <span className="text-[13px] font-semibold">{fmtDate(interview.scheduled_at)}</span>
                        {today && <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">TODAY</span>}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="8" cy="8" r="6.5"/><path strokeLinecap="round" d="M8 5v3.5l2 1.5"/>
                        </svg>
                        <span className="text-[13px]">{fmtTime(interview.scheduled_at)}</span>
                        {interview.timezone && <span className="text-[11px] text-slate-400">{interview.timezone}</span>}
                    </div>

                    {/* Rescheduled indicator */}
                    {interview.rescheduled_at && (
                        <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" d="M2 8h12M10 4l4 4-4 4"/>
                            </svg>
                            Rescheduled
                        </span>
                    )}
                </div>

                {/* Notes */}
                {interview.notes && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-amber-700 mb-0.5">Notes</p>
                        <p className="text-[12px] text-amber-600 leading-relaxed">{interview.notes}</p>
                    </div>
                )}

                {/* Location */}
                {interview.vacancy_location && (
                    <p className="mt-2 text-[12px] text-slate-400 flex items-center gap-1.5">
                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.485-2.015-4.5-4.5-4.5z"/>
                            <circle cx="8" cy="6" r="1.5"/>
                        </svg>
                        {interview.vacancy_location}
                    </p>
                )}

                {/* Actions */}
                {canAct && (
                    <div className="mt-4 flex gap-2">
                        <a
                            href={`/interviews/${interview.id}/join`}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                soon || today
                                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9.5l-3 2.5V12H3.5A1.5 1.5 0 012 10.5v-7z"/>
                            </svg>
                            {soon || today ? "Join Now" : "Open Room"}
                        </a>
                        <button
                            onClick={onReschedule}
                            title="Reschedule"
                            className="px-3.5 py-2.5 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 text-sm transition-colors flex items-center gap-1.5 font-medium"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" d="M2 8h12M10 4l4 4-4 4"/>
                            </svg>
                            Reschedule
                        </button>
                        {!past && (
                            <button
                                onClick={() => {
                                    if (confirm("Mark this interview as completed?")) {
                                        router.patch(`/employer/interviews/${interview.id}/complete`, {}, { preserveScroll: true });
                                    }
                                }}
                                title="Mark Complete"
                                className="px-3.5 py-2.5 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-sm transition-colors flex items-center gap-1.5 font-medium"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" d="M2 8l4 4 8-8"/>
                                </svg>
                                Complete
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm("Cancel this interview?")) {
                                    router.delete(`/employer/interviews/${interview.id}`, { preserveScroll: true });
                                }
                            }}
                            title="Cancel"
                            className="w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8"/>
                            </svg>
                        </button>
                    </div>
                )}

                {interview.status === "completed" && (
                    <div className="mt-3 flex items-center gap-2 text-[12px] text-emerald-600">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M2 8l4 4 8-8"/>
                        </svg>
                        Interview completed
                        <a href={`/employer/applications`} className="ml-auto text-blue-500 hover:underline">View application →</a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ interviews }: { interviews: Interview[] }) {
    const upcoming = interviews.filter(i => i.status === "scheduled" && !isPast(i.scheduled_at));
    const todayCount = interviews.filter(i => i.status === "scheduled" && isToday(i.scheduled_at));
    return (
        <div className="grid grid-cols-4 gap-3 mb-6">
            {[
                { label: "Total", value: interviews.length, color: "text-slate-800", bg: "bg-white" },
                { label: "Upcoming", value: upcoming.length, color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Today", value: todayCount.length, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Completed", value: interviews.filter(i => i.status === "completed").length, color: "text-emerald-600", bg: "bg-emerald-50" },
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

type FilterStatus = "all" | "scheduled" | "completed" | "cancelled";

export default function EmployerInterviews({ interviews }: Props) {
    const [rescheduleTarget, setRescheduleTarget] = useState<Interview | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [search, setSearch] = useState("");

    const upcoming = interviews.filter(i => i.status === "scheduled" && !isPast(i.scheduled_at));
    const past = interviews.filter(i => i.status !== "scheduled" || isPast(i.scheduled_at));

    const filtered = interviews.filter(i => {
        if (filterStatus !== "all" && i.status !== filterStatus) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                i.candidate_name.toLowerCase().includes(q) ||
                (i.candidate_email ?? "").toLowerCase().includes(q) ||
                i.vacancy_title.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const filteredUpcoming = filtered.filter(i => i.status === "scheduled" && !isPast(i.scheduled_at));
    const filteredPast = filtered.filter(i => i.status !== "scheduled" || isPast(i.scheduled_at));

    return (
        <AppLayout>
            <Head title="Interviews" />

            <style>{`
                @keyframes dialog-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-dialog-in { animation: dialog-in 0.2s cubic-bezier(0.22,1,0.36,1); }
            `}</style>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interviews</h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {upcoming.length === 0
                                ? "No upcoming interviews scheduled"
                                : `${upcoming.length} upcoming interview${upcoming.length > 1 ? "s" : ""}`}
                        </p>
                    </div>
                    <a href="/employer/applications" className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M15 19.128a9.38 9.38 0 002.625.372"/>
                            <path strokeLinecap="round" d="M2 9a7 7 0 1114 0"/>
                        </svg>
                        View Applications
                    </a>
                </div>

                <StatsBar interviews={interviews} />

                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-40">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 5.5a4.5 4.5 0 117.91 2.912l2.718 2.719a.75.75 0 01-1.06 1.06L7.85 9.473A4.5 4.5 0 011 5.5z" fillRule="evenodd" clipRule="evenodd"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by candidate or role…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["all", "scheduled", "completed", "cancelled"] as FilterStatus[]).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors capitalize ${filterStatus === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                {s === "all" ? "All" : s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                        <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
                            </svg>
                        </div>
                        <p className="font-semibold text-slate-500">No interviews {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}</p>
                        <p className="text-slate-400 text-sm mt-1">Schedule interviews from the Applications page.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredUpcoming.length > 0 && (
                            <div>
                                <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">Upcoming</h2>
                                <div className="space-y-3">
                                    {filteredUpcoming.map(i => (
                                        <InterviewCard key={i.id} interview={i} onReschedule={() => setRescheduleTarget(i)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {filteredPast.length > 0 && (
                            <div>
                                <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">Past</h2>
                                <div className="space-y-3">
                                    {filteredPast.map(i => (
                                        <InterviewCard key={i.id} interview={i} onReschedule={() => setRescheduleTarget(i)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {rescheduleTarget && (
                <RescheduleDialog interview={rescheduleTarget} onClose={() => setRescheduleTarget(null)} />
            )}
        </AppLayout>
    );
}