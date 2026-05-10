import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interview {
    id: number;
    scheduled_at: string;
    status: "scheduled" | "completed" | "cancelled";
    notes: string | null;
    timezone: string | null;
    room_id: string;
    vacancy_title: string;
    vacancy_location: string | null;
    employer_name: string;
    application_id: number;
}

interface Props {
    interviews: Interview[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtFull(iso: string): string {
    return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function isToday(iso: string): boolean {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isSoon(iso: string): boolean {
    const diff = new Date(iso).getTime() - Date.now();
    return diff > 0 && diff < 30 * 60 * 1000; // within 30 min
}
function isPast(iso: string): boolean {
    return new Date(iso).getTime() < Date.now();
}

const STATUS_STYLES = {
    scheduled: { bg: "bg-violet-50 border-violet-200", text: "text-violet-700", dot: "bg-violet-500", label: "Scheduled" },
    completed:  { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
    cancelled:  { bg: "bg-slate-100 border-slate-200", text: "text-slate-400", dot: "bg-slate-300", label: "Cancelled" },
};

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ interviews, onSelectDate, selectedDate }: {
    interviews: Interview[];
    selectedDate: Date | null;
    onSelectDate: (d: Date | null) => void;
}) {
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Days with interviews
    const interviewDays = new Set(
        interviews
            .filter(i => i.status === "scheduled")
            .map(i => {
                const d = new Date(i.scheduled_at);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
    );

    function prevMonth() { setViewMonth(new Date(year, month - 1, 1)); }
    function nextMonth() { setViewMonth(new Date(year, month + 1, 1)); }

    const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06L4.97 8.03a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
                </button>
                <p className="text-[13px] font-semibold text-slate-800">{MONTHS[month]} {year}</p>
                <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06-1.06L9.44 7.5 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd"/></svg>
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
                ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const dateKey = `${year}-${month}-${day}`;
                    const hasInterview = interviewDays.has(dateKey);
                    const isCurrentDay = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const isSelected = selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

                    return (
                        <button
                            key={i}
                            onClick={() => {
                                const clickedDate = new Date(year, month, day);
                                onSelectDate(isSelected ? null : clickedDate);
                            }}
                            className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-full text-[12px] font-medium transition-all
                                ${isSelected ? "bg-blue-600 text-white" : isCurrentDay ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700 hover:bg-slate-100"}
                            `}
                        >
                            {day}
                            {hasInterview && (
                                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-violet-500"}`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {selectedDate && (
                <button onClick={() => onSelectDate(null)} className="mt-3 w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors text-center">
                    Clear filter
                </button>
            )}
        </div>
    );
}

// ─── Interview Card ───────────────────────────────────────────────────────────

function InterviewCard({ interview }: { interview: Interview }) {
    const style = STATUS_STYLES[interview.status];
    const soon = isSoon(interview.scheduled_at);
    const today = isToday(interview.scheduled_at);
    const past = isPast(interview.scheduled_at);
    const canJoin = interview.status === "scheduled" && !past;
    const joinNow = soon || today;

    return (
        <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${interview.status === "cancelled" ? "opacity-60" : "hover:shadow-sm"} ${soon ? "border-violet-300 shadow-md shadow-violet-100" : "border-slate-200"}`}>
            {/* Urgent banner */}
            {soon && (
                <div className="bg-violet-600 text-white text-[12px] font-semibold px-4 py-1.5 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                    </svg>
                    Starting soon — be ready!
                </div>
            )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Job info */}
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {interview.vacancy_title.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-slate-900 truncate">{interview.vacancy_title}</h3>
                            <p className="text-[12px] text-slate-400 mt-0.5">with {interview.employer_name}</p>
                        </div>
                    </div>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                    </span>
                </div>

                {/* Date/time row */}
                <div className="flex items-center gap-4 mb-3">
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
                            <circle cx="8" cy="8" r="6.5"/>
                            <path strokeLinecap="round" d="M8 5v3.5l2 1.5"/>
                        </svg>
                        <span className="text-[13px]">{fmtTime(interview.scheduled_at)}</span>
                        {interview.timezone && <span className="text-[11px] text-slate-400">{interview.timezone}</span>}
                    </div>
                </div>

                {/* Notes */}
                {interview.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3">
                        <p className="text-[11px] font-semibold text-amber-700 mb-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z"/></svg>
                            Notes from employer
                        </p>
                        <p className="text-[12px] text-amber-600 leading-relaxed">{interview.notes}</p>
                    </div>
                )}

                {/* Actions */}
                {interview.status === "scheduled" && (
                    <div className="flex gap-2">
                        <a
                            href={`/interviews/${interview.id}/join`}
                            target="_blank"
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                joinNow
                                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9.5l-3 2.5V12H3.5A1.5 1.5 0 012 10.5v-7z"/>
                            </svg>
                            {joinNow ? "Join Now" : "Open Room"}
                        </a>
                        <button
                            onClick={() => {
                                if (confirm("Cancel this interview? You can ask the employer to reschedule.")) {
                                    router.delete(`/interviews/${interview.id}`, { preserveScroll: true });
                                }
                            }}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-sm transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InterviewsIndex({ interviews }: Props) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const upcoming = interviews.filter(i => i.status === "scheduled" && !isPast(i.scheduled_at));
    const past = interviews.filter(i => i.status !== "scheduled" || isPast(i.scheduled_at));

    const displayed = selectedDate
        ? interviews.filter(i => {
            const d = new Date(i.scheduled_at);
            return d.getFullYear() === selectedDate.getFullYear()
                && d.getMonth() === selectedDate.getMonth()
                && d.getDate() === selectedDate.getDate();
          })
        : null;

    return (
        <AppLayout>
            <Head title="My Interviews" />
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Interviews</h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {upcoming.length === 0 ? "No upcoming interviews" : `${upcoming.length} upcoming interview${upcoming.length > 1 ? "s" : ""}`}
                    </p>
                </div>

                <div className="flex gap-6 items-start">
                    {/* Sidebar: calendar */}
                    <div className="w-64 shrink-0 space-y-4">
                        <MiniCalendar
                            interviews={interviews}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />

                        {/* Quick stats */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                            {[
                                { label: "Upcoming", value: upcoming.length, color: "text-violet-600", bg: "bg-violet-50" },
                                { label: "Total", value: interviews.length, color: "text-slate-700", bg: "bg-slate-50" },
                                { label: "Completed", value: interviews.filter(i => i.status === "completed").length, color: "text-emerald-600", bg: "bg-emerald-50" },
                            ].map(s => (
                                <div key={s.label} className={`flex items-center justify-between ${s.bg} rounded-xl px-3 py-2`}>
                                    <span className="text-[12px] text-slate-500">{s.label}</span>
                                    <span className={`text-[15px] font-bold ${s.color}`}>{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-6">
                        {/* Date-filtered view */}
                        {selectedDate && (
                            <div>
                                <h2 className="text-[13px] font-semibold text-slate-500 mb-3">
                                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                                </h2>
                                {displayed!.length === 0 ? (
                                    <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl text-slate-400 text-sm">
                                        No interviews on this day.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {displayed!.map(i => <InterviewCard key={i.id} interview={i} />)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* All interviews (when no date selected) */}
                        {!selectedDate && (
                            <>
                                {/* Upcoming */}
                                {upcoming.length > 0 && (
                                    <div>
                                        <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Upcoming</h2>
                                        <div className="space-y-3">
                                            {upcoming.map(i => <InterviewCard key={i.id} interview={i} />)}
                                        </div>
                                    </div>
                                )}

                                {/* Past */}
                                {past.length > 0 && (
                                    <div>
                                        <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Past</h2>
                                        <div className="space-y-3">
                                            {past.map(i => <InterviewCard key={i.id} interview={i} />)}
                                        </div>
                                    </div>
                                )}

                                {/* Empty state */}
                                {interviews.length === 0 && (
                                    <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                                            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/>
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-slate-600">No interviews yet</p>
                                        <p className="text-slate-400 text-sm mt-1">When an employer schedules an interview, it will appear here.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}