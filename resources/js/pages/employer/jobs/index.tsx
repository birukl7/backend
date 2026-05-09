import AppLayout from "@/layouts/app-layout";
import { Head, useForm, router } from "@inertiajs/react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmploymentType = "full_time" | "part_time" | "contract" | "temporary" | "internship";
type WorkType = "remote" | "on_site" | "hybrid";
type Status = "open" | "closed";

interface Vacancy {
    id: number;
    title: string;
    description: string;
    requirements: string | null;
    location: string | null;
    salary_min: string | null;
    salary_max: string | null;
    employment_type: EmploymentType;
    status: Status;
    work_type: WorkType;
    application_deadline: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    vacancies: Vacancy[];
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
    full_time: "Full-time", part_time: "Part-time", contract: "Contract",
    temporary: "Temporary", internship: "Internship",
};
const WORK_TYPE_LABELS: Record<WorkType, string> = {
    remote: "Remote", on_site: "On-site", hybrid: "Hybrid",
};
const WORK_TYPE_COLORS: Record<WorkType, string> = {
    remote: "bg-emerald-50 text-emerald-700 border-emerald-200",
    on_site: "bg-slate-100 text-slate-600 border-slate-200",
    hybrid: "bg-violet-50 text-violet-700 border-violet-200",
};
const EMPLOYMENT_COLORS: Record<EmploymentType, string> = {
    full_time: "bg-blue-50 text-blue-700 border-blue-200",
    part_time: "bg-amber-50 text-amber-700 border-amber-200",
    contract: "bg-orange-50 text-orange-700 border-orange-200",
    temporary: "bg-pink-50 text-pink-700 border-pink-200",
    internship: "bg-teal-50 text-teal-700 border-teal-200",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(min: string | null, max: string | null): string {
    if (!min && !max) return "Not specified";
    const fmt = (v: string) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(parseFloat(v));
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

// ─── Shared field component ───────────────────────────────────────────────────

const inp = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300";
const inp2col = inp;

function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{children}</label>;
}

function FieldErr({ msg }: { msg?: string }) {
    return msg ? <p className="text-red-500 text-[11px] mt-1">{msg}</p> : null;
}

// ─── Job Dialog ───────────────────────────────────────────────────────────────

type DialogMode = "create" | "edit" | "view";

interface DialogProps {
    mode: DialogMode;
    vacancy?: Vacancy;
    onClose: () => void;
}

const defaultForm = {
    title: "",
    description: "",
    requirements: "",
    location: "",
    salary_min: "",
    salary_max: "",
    employment_type: "full_time" as EmploymentType,
    status: "open" as Status,
    work_type: "on_site" as WorkType,
    application_deadline: "",
};

function JobDialog({ mode, vacancy, onClose }: DialogProps) {
    const isView = mode === "view";
    const isEdit = mode === "edit";
    const isCreate = mode === "create";

    const { data, setData, post, put, processing, errors, reset } = useForm(
        vacancy
            ? {
                title: vacancy.title,
                description: vacancy.description,
                requirements: vacancy.requirements ?? "",
                location: vacancy.location ?? "",
                salary_min: vacancy.salary_min ?? "",
                salary_max: vacancy.salary_max ?? "",
                employment_type: vacancy.employment_type,
                status: vacancy.status,
                work_type: vacancy.work_type,
                application_deadline: vacancy.application_deadline ?? "",
            }
            : { ...defaultForm }
    );

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && vacancy) {
            put(`/employer/jobs/${vacancy.id}`, { onSuccess: onClose });
        } else {
            post("/employer/jobs", { onSuccess: () => { reset(); onClose(); } });
        }
    }

    const deadline = vacancy?.application_deadline ? daysUntil(vacancy.application_deadline) : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-[3px] z-40"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-dialog-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Dialog Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCreate ? "bg-blue-600" : isEdit ? "bg-amber-500" : "bg-slate-100"}`}>
                                {isCreate && (
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                                    </svg>
                                )}
                                {isEdit && (
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/>
                                    </svg>
                                )}
                                {isView && (
                                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
                                        <circle cx="8" cy="8" r="2"/>
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    {isCreate ? "Post a New Job" : isEdit ? "Edit Job Posting" : vacancy?.title}
                                </h2>
                                <p className="text-[12px] text-slate-400 mt-0.5">
                                    {isCreate ? "Fill in the details below to publish your vacancy" : isEdit ? "Update the vacancy details" : `Posted ${timeAgo(vacancy!.created_at)}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable body */}
                    <div className="overflow-y-auto flex-1 px-8 py-6">
                        {isView && vacancy ? (
                            // ── View mode ──────────────────────────────────────────
                            <div className="space-y-6">
                                {/* Status + tags row */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border ${vacancy.status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${vacancy.status === "open" ? "bg-emerald-500" : "bg-slate-400"}`} />
                                        {vacancy.status === "open" ? "Open" : "Closed"}
                                    </span>
                                    <span className={`text-[12px] font-medium px-3 py-1.5 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>{WORK_TYPE_LABELS[vacancy.work_type]}</span>
                                    <span className={`text-[12px] font-medium px-3 py-1.5 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>{EMPLOYMENT_LABELS[vacancy.employment_type]}</span>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: "Salary", value: formatSalary(vacancy.salary_min, vacancy.salary_max) },
                                        { label: "Location", value: vacancy.location || "Not specified" },
                                        {
                                            label: "Deadline",
                                            value: vacancy.application_deadline
                                                ? new Date(vacancy.application_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                : "No deadline",
                                            urgent: isUrgent,
                                        },
                                    ].map((item) => (
                                        <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                            <p className={`text-sm font-semibold ${item.urgent ? "text-red-500" : "text-slate-800"}`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Description */}
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{vacancy.description}</p>
                                </div>

                                {/* Requirements */}
                                {vacancy.requirements && (
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Requirements</p>
                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{vacancy.requirements}</p>
                                    </div>
                                )}

                                {isUrgent && deadline !== null && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                        <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                                        </svg>
                                        <p className="text-red-600 text-[13px] font-medium">
                                            {deadline === 0 ? "Closes today!" : `${deadline} day${deadline === 1 ? "" : "s"} left to apply`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // ── Create / Edit form ─────────────────────────────────
                            <form id="job-form" onSubmit={submit} className="space-y-5">
                                {/* Title */}
                                <div>
                                    <Label>Job Title <span className="text-red-400">*</span></Label>
                                    <input
                                        className={inp}
                                        value={data.title}
                                        onChange={(e) => setData("title", e.target.value)}
                                        placeholder="e.g. Senior Frontend Engineer"
                                        required
                                    />
                                    <FieldErr msg={errors.title} />
                                </div>

                                {/* Description */}
                                <div>
                                    <Label>Description <span className="text-red-400">*</span></Label>
                                    <textarea
                                        className={inp + " resize-none"}
                                        rows={5}
                                        value={data.description}
                                        onChange={(e) => setData("description", e.target.value)}
                                        placeholder="Describe the role, responsibilities, and what success looks like…"
                                        required
                                    />
                                    <FieldErr msg={errors.description} />
                                </div>

                                {/* Requirements */}
                                <div>
                                    <Label>Requirements</Label>
                                    <textarea
                                        className={inp + " resize-none"}
                                        rows={3}
                                        value={data.requirements}
                                        onChange={(e) => setData("requirements", e.target.value)}
                                        placeholder="3+ years React experience, TypeScript, etc."
                                    />
                                    <FieldErr msg={errors.requirements} />
                                </div>

                                {/* Row: location + deadline */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Location</Label>
                                        <input
                                            className={inp2col}
                                            value={data.location}
                                            onChange={(e) => setData("location", e.target.value)}
                                            placeholder="Addis Ababa, Ethiopia"
                                        />
                                        <FieldErr msg={errors.location} />
                                    </div>
                                    <div>
                                        <Label>Application Deadline</Label>
                                        <input
                                            type="date"
                                            className={inp2col}
                                            value={data.application_deadline}
                                            onChange={(e) => setData("application_deadline", e.target.value)}
                                        />
                                        <FieldErr msg={errors.application_deadline} />
                                    </div>
                                </div>

                                {/* Row: salary min + max */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Salary Min (USD)</Label>
                                        <input
                                            type="number"
                                            className={inp2col}
                                            value={data.salary_min}
                                            onChange={(e) => setData("salary_min", e.target.value)}
                                            placeholder="30000"
                                            min={0}
                                        />
                                        <FieldErr msg={errors.salary_min} />
                                    </div>
                                    <div>
                                        <Label>Salary Max (USD)</Label>
                                        <input
                                            type="number"
                                            className={inp2col}
                                            value={data.salary_max}
                                            onChange={(e) => setData("salary_max", e.target.value)}
                                            placeholder="60000"
                                            min={0}
                                        />
                                        <FieldErr msg={errors.salary_max} />
                                    </div>
                                </div>

                                {/* Row: employment type + work type + status */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Employment Type <span className="text-red-400">*</span></Label>
                                        <select
                                            className={inp2col + " cursor-pointer"}
                                            value={data.employment_type}
                                            onChange={(e) => setData("employment_type", e.target.value as EmploymentType)}
                                        >
                                            <option value="full_time">Full-time</option>
                                            <option value="part_time">Part-time</option>
                                            <option value="contract">Contract</option>
                                            <option value="temporary">Temporary</option>
                                            <option value="internship">Internship</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Work Type <span className="text-red-400">*</span></Label>
                                        <select
                                            className={inp2col + " cursor-pointer"}
                                            value={data.work_type}
                                            onChange={(e) => setData("work_type", e.target.value as WorkType)}
                                        >
                                            <option value="on_site">On-site</option>
                                            <option value="remote">Remote</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Status <span className="text-red-400">*</span></Label>
                                        <select
                                            className={inp2col + " cursor-pointer"}
                                            value={data.status}
                                            onChange={(e) => setData("status", e.target.value as Status)}
                                        >
                                            <option value="open">Open</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Dialog Footer */}
                    <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-white transition-colors"
                        >
                            {isView ? "Close" : "Cancel"}
                        </button>

                        {!isView && (
                            <button
                                type="submit"
                                form="job-form"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                                {processing && (
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                    </svg>
                                )}
                                {processing ? "Saving…" : isCreate ? "Post Job" : "Save Changes"}
                            </button>
                        )}

                        {isView && vacancy && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (confirm("Delete this job posting?")) {
                                            router.delete(`/employer/jobs/${vacancy.id}`, { onSuccess: onClose });
                                        }
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"/>
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

function StatsBar({ vacancies }: { vacancies: Vacancy[] }) {
    const open = vacancies.filter((v) => v.status === "open").length;
    const closed = vacancies.filter((v) => v.status === "closed").length;
    const remote = vacancies.filter((v) => v.work_type === "remote").length;

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            {[
                { label: "Total Postings", value: vacancies.length, color: "text-slate-800", bg: "bg-white" },
                { label: "Open", value: open, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Closed", value: closed, color: "text-slate-500", bg: "bg-slate-50" },
            ].map((s) => (
                <div key={s.label} className={`${s.bg} border border-slate-200 rounded-2xl px-5 py-4`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{s.label}</p>
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
    const deadline = vacancy.application_deadline ? daysUntil(vacancy.application_deadline) : null;
    const isUrgent = deadline !== null && deadline <= 5 && deadline >= 0;
    const isExpired = deadline !== null && deadline < 0;
    const salary = formatSalary(vacancy.salary_min, vacancy.salary_max);

    return (
        <div className="group bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-150 cursor-pointer" onClick={onView}>
            {/* Left: color strip based on status */}
            <div className={`w-1 h-12 rounded-full shrink-0 ${vacancy.status === "open" ? "bg-emerald-400" : "bg-slate-200"}`} />

            {/* Main info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-[14px] truncate group-hover:text-blue-600 transition-colors">{vacancy.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${vacancy.status === "open" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {vacancy.status === "open" ? "● OPEN" : "CLOSED"}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {vacancy.location && (
                        <span className="text-[12px] text-slate-400 flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM1.5 6a6.5 6.5 0 1111.6 4.027l2.687 2.686a.75.75 0 01-1.06 1.061l-2.687-2.686A6.5 6.5 0 011.5 6z" clipRule="evenodd"/>
                            </svg>
                            {vacancy.location}
                        </span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${WORK_TYPE_COLORS[vacancy.work_type]}`}>{WORK_TYPE_LABELS[vacancy.work_type]}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${EMPLOYMENT_COLORS[vacancy.employment_type]}`}>{EMPLOYMENT_LABELS[vacancy.employment_type]}</span>
                </div>
            </div>

            {/* Salary */}
            <div className="text-right shrink-0 hidden sm:block">
                <p className="text-[13px] font-semibold text-slate-800">{salary}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(vacancy.created_at)}</p>
            </div>

            {/* Deadline */}
            <div className="shrink-0 hidden md:block w-24 text-right">
                {vacancy.application_deadline ? (
                    <p className={`text-[12px] font-medium ${isUrgent ? "text-red-500" : isExpired ? "text-slate-400 line-through" : "text-slate-600"}`}>
                        {isExpired ? "Expired" : deadline === 0 ? "Today" : `${deadline}d left`}
                    </p>
                ) : (
                    <p className="text-[12px] text-slate-300">No deadline</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onEdit}
                    title="Edit"
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/>
                    </svg>
                </button>
                <button
                    onClick={onDelete}
                    title="Delete"
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = "all" | Status;

export default function EmployerJobsIndex({ vacancies }: Props) {
    const [dialog, setDialog] = useState<{ mode: DialogMode; vacancy?: Vacancy } | null>(null);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [search, setSearch] = useState("");

    function closeDialog() { setDialog(null); }

    function confirmDelete(vacancy: Vacancy) {
        if (confirm(`Delete "${vacancy.title}"? This cannot be undone.`)) {
            router.delete(`/employer/jobs/${vacancy.id}`);
        }
    }

    const filtered = vacancies.filter((v) => {
        if (filterStatus !== "all" && v.status !== filterStatus) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return v.title.toLowerCase().includes(q) || (v.location ?? "").toLowerCase().includes(q);
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

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Page header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Postings</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Manage all your vacancy listings</p>
                    </div>
                    <button
                        onClick={() => setDialog({ mode: "create" })}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                        </svg>
                        Post a Job
                    </button>
                </div>

                {/* Stats */}
                <StatsBar vacancies={vacancies} />

                {/* Search + Filter */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-48">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 3a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM1 5.5a4.5 4.5 0 117.91 2.912l2.718 2.719a.75.75 0 01-1.06 1.06L7.85 9.473A4.5 4.5 0 011 5.5z" clipRule="evenodd" fillRule="evenodd"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by title or location…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                        {(["all", "open", "closed"] as FilterStatus[]).map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors capitalize ${filterStatus === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Job list */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                            </svg>
                        </div>
                        <p className="font-semibold text-slate-600">
                            {vacancies.length === 0 ? "No job postings yet" : "No results match your filters"}
                        </p>
                        <p className="text-slate-400 text-sm mt-1 mb-5">
                            {vacancies.length === 0 ? "Click \"Post a Job\" to create your first vacancy" : "Try adjusting your search or filter"}
                        </p>
                        {vacancies.length === 0 && (
                            <button
                                onClick={() => setDialog({ mode: "create" })}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                                </svg>
                                Post your first job
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {/* Table header */}
                        <div className="grid px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1" style={{ gridTemplateColumns: "auto 1fr 120px 96px 80px" }}>
                            <div className="w-3 mr-4" />
                            <div>Job</div>
                            <div className="text-right hidden sm:block">Salary</div>
                            <div className="text-right hidden md:block">Deadline</div>
                            <div />
                        </div>
                        {filtered.map((v) => (
                            <JobRow
                                key={v.id}
                                vacancy={v}
                                onView={() => setDialog({ mode: "view", vacancy: v })}
                                onEdit={() => setDialog({ mode: "edit", vacancy: v })}
                                onDelete={() => confirmDelete(v)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog */}
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