import { useState } from "react";
import { usePage } from "@inertiajs/react";

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

interface AuthUser {
    id: number;
    name: string;
    email: string;
    profile_photo_url?: string;
}

interface Props {
    vacancies: Vacancy[];
}

const EMPLOYMENT_LABELS: Record<Vacancy["employment_type"], string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    temporary: "Temporary",
    internship: "Internship",
};

const WORK_TYPE_LABELS: Record<Vacancy["work_type"], string> = {
    remote: "Remote",
    on_site: "On-site",
    hybrid: "Hybrid",
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

// ─── Profile Sidebar ─────────────────────────────────────────────────────────

function ProfileSidebar({ user }: { user: AuthUser }) {
    const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

    return (
        <aside className="w-60 shrink-0 space-y-3">
            {/* Profile card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-12 bg-gradient-to-r from-blue-500 to-blue-600" />
                <div className="px-4 pb-4">
                    <div className="relative -mt-6 mb-3">
                        {user.profile_photo_url ? (
                            <img
                                src={user.profile_photo_url}
                                alt={user.name}
                                className="w-12 h-12 rounded-full border-[3px] border-white object-cover shadow"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full border-[3px] border-white bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow">
                                {initials}
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                    </div>
                    <h2 className="font-semibold text-slate-900 text-[14px] leading-tight">{user.name}</h2>
                    <p className="text-slate-400 text-[12px] mt-0.5 truncate">{user.email}</p>
                    <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-500 underline underline-offset-2 cursor-pointer hover:text-slate-700 transition-colors">
                                Complete your profile
                            </span>
                            <span className="text-[11px] font-bold text-blue-600">100%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-blue-500 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick stats */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 grid grid-cols-2 gap-2">
                {[
                    { label: "Applied", value: "12" },
                    { label: "Saved", value: "5" },
                    { label: "Interviews", value: "2" },
                    { label: "Offers", value: "1" },
                ].map((s) => (
                    <div key={s.label} className="text-center bg-slate-50 rounded-xl py-2">
                        <p className="text-lg font-bold text-slate-800">{s.value}</p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {[
                    {
                        icon: (
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9.5a2 2 0 100-4 2 2 0 000 4zM13.5 8a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
                            </svg>
                        ),
                        label: "Manage Profile",
                        sub: "Update your info",
                        href: "/profile",
                        color: "text-blue-600 bg-blue-50",
                    },
                    {
                        icon: (
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 1.5l1.75 3.5 3.75.5-2.75 2.75.75 3.75L8 10l-3.5 2 .75-3.75L2.5 5.5l3.75-.5L8 1.5z"/>
                            </svg>
                        ),
                        label: "Skill Score",
                        sub: "View your ratings",
                        href: "/skills",
                        color: "text-amber-600 bg-amber-50",
                    },
                    {
                        icon: (
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 2.5h13v9h-13zM5.5 11.5v2M10.5 11.5v2M3.5 13.5h9"/>
                            </svg>
                        ),
                        label: "Take a Quiz",
                        sub: "Earn certifications",
                        href: "/quiz",
                        color: "text-emerald-600 bg-emerald-50",
                    },
                ].map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                    >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                            {item.icon}
                        </span>
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

// ─── Job Detail Drawer ───────────────────────────────────────────────────────

function JobDrawer({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline ? daysUntil(vacancy.application_deadline) : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;

    return (
        <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <span className="text-[13px] font-medium text-slate-400">Job Details</span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                        </svg>
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Title block */}
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
                            <span className={`text-[12px] font-medium px-3 py-1 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>
                                {WORK_TYPE_LABELS[vacancy.work_type]}
                            </span>
                            <span className={`text-[12px] font-medium px-3 py-1 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>
                                {EMPLOYMENT_LABELS[vacancy.employment_type]}
                            </span>
                            <span className={`text-[12px] font-medium px-3 py-1 rounded-full border ${vacancy.status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                {vacancy.status === "open" ? "● Open" : "Closed"}
                            </span>
                        </div>
                    </div>

                    {/* Key info grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Salary", value: salary ?? "Not specified" },
                            { label: "Posted", value: timeAgo(vacancy.created_at) },
                            {
                                label: "Deadline",
                                value: vacancy.application_deadline
                                    ? new Date(vacancy.application_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                    : "No deadline",
                                urgent: isUrgent,
                            },
                            { label: "Employment", value: EMPLOYMENT_LABELS[vacancy.employment_type] },
                        ].map((item) => (
                            <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p className="text-[11px] text-slate-400 mb-1 uppercase tracking-wide">{item.label}</p>
                                <p className={`text-[14px] font-semibold ${item.urgent ? "text-red-500" : "text-slate-800"}`}>
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Urgent banner */}
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

                    {/* Description */}
                    <div>
                        <h3 className="text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">About the Role</h3>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{vacancy.description}</p>
                    </div>

                    {/* Requirements */}
                    {vacancy.requirements && (
                        <div>
                            <h3 className="text-[12px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">Requirements</h3>
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{vacancy.requirements}</p>
                        </div>
                    )}
                </div>

                {/* Sticky footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors">
                        Apply Now
                    </button>
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

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ vacancy, onClick }: { vacancy: Vacancy; onClick: () => void }) {
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);
    const deadline = vacancy.application_deadline ? daysUntil(vacancy.application_deadline) : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired = deadline !== null && deadline < 0;

    return (
        <div
            onClick={onClick}
            className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0 border border-slate-200">
                        {vacancy.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-[15px] leading-snug truncate group-hover:text-blue-600 transition-colors">
                            {vacancy.title}
                        </h3>
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
                <div className="shrink-0">
                    {vacancy.status === "open" && !isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Open
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            Closed
                        </span>
                    )}
                </div>
            </div>

            <p className="text-slate-500 text-[13px] leading-relaxed line-clamp-2 mb-3">{vacancy.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>
                    {WORK_TYPE_LABELS[vacancy.work_type]}
                </span>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>
                    {EMPLOYMENT_LABELS[vacancy.employment_type]}
                </span>
                {vacancy.requirements && (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200 truncate max-w-[160px]">
                        {vacancy.requirements}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                    {salary ? (
                        <span className="text-slate-800 font-semibold text-[13px]">{salary}</span>
                    ) : (
                        <span className="text-slate-400 text-[13px]">Salary not listed</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isUrgent && (
                        <span className="text-[11px] font-medium text-red-500">
                            {deadline === 0 ? "Closes today" : `${deadline}d left`}
                        </span>
                    )}
                    <span className="text-slate-400 text-[12px]">{timeAgo(vacancy.created_at)}</span>
                    <span className="text-[12px] font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        View →
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type FilterWorkType = "all" | Vacancy["work_type"];
type FilterEmployment = "all" | Vacancy["employment_type"];

export default function JobListings({ vacancies }: Props) {
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth.user;

    const [search, setSearch] = useState("");
    const [workType, setWorkType] = useState<FilterWorkType>("all");
    const [employment, setEmployment] = useState<FilterEmployment>("all");
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [selected, setSelected] = useState<Vacancy | null>(null);

    const filtered = vacancies.filter((v) => {
        if (showOpenOnly && v.status !== "open") return false;
        if (workType !== "all" && v.work_type !== workType) return false;
        if (employment !== "all" && v.employment_type !== employment) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                v.title.toLowerCase().includes(q) ||
                v.description.toLowerCase().includes(q) ||
                (v.location ?? "").toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <>
            <style>{`
                @keyframes slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>

            <div className="flex gap-5 px-6 py-6 w-full min-h-0">
                <ProfileSidebar user={user} />

                {/* Job list */}
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Job Board</h1>
                            <p className="text-slate-400 text-sm mt-0.5">
                                {filtered.length} {filtered.length === 1 ? "position" : "positions"} available
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 5.5a4.5 4.5 0 117.91 2.912l2.718 2.719a.75.75 0 01-1.06 1.06L7.85 9.473A4.5 4.5 0 011 5.5z" clipRule="evenodd" fillRule="evenodd"/>
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by title, skill, or location..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={workType}
                                onChange={(e) => setWorkType(e.target.value as FilterWorkType)}
                                className="text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                            >
                                <option value="all">All work types</option>
                                <option value="remote">Remote</option>
                                <option value="hybrid">Hybrid</option>
                                <option value="on_site">On-site</option>
                            </select>
                            <select
                                value={employment}
                                onChange={(e) => setEmployment(e.target.value as FilterEmployment)}
                                className="text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                            >
                                <option value="all">All job types</option>
                                <option value="full_time">Full-time</option>
                                <option value="part_time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="temporary">Temporary</option>
                                <option value="internship">Internship</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer ml-auto">
                                <div
                                    onClick={() => setShowOpenOnly(!showOpenOnly)}
                                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${showOpenOnly ? "bg-blue-500" : "bg-slate-200"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showOpenOnly ? "translate-x-4" : ""}`} />
                                </div>
                                <span className="text-[13px] text-slate-600 select-none">Open only</span>
                            </label>
                        </div>
                    </div>

                    {/* Cards */}
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
                                <JobCard key={v.id} vacancy={v} onClick={() => setSelected(v)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selected && <JobDrawer vacancy={selected} onClose={() => setSelected(null)} />}
        </>
    );
}