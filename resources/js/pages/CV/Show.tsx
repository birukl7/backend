import AppLayout from "@/layouts/app-layout";
import { Head, router, useForm } from "@inertiajs/react";
import { useState, useRef, useCallback } from "react";



// ─── Types ────────────────────────────────────────────────────────────────────

interface CvExperience {
    id: number; cv_id: number; job_title: string; company_name: string;
    location: string | null; description: string | null;
    start_date: string; end_date: string | null; is_current: boolean; sort_order: number;
}
interface CvEducation {
    id: number; cv_id: number; institution_name: string; degree: string;
    field_of_study: string; location: string | null; description: string | null;
    start_date: string; end_date: string | null; is_current: boolean; sort_order: number;
}
interface CvSkill {
    id: number; cv_id: number; skill_name: string;
    proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
    category: string | null; sort_order: number;
}
interface CvProject {
    id: number; cv_id: number; project_name: string; description: string | null;
    url: string | null; tech_stack: string | null;
    start_date: string | null; end_date: string | null; sort_order: number;
}
interface Cv {
    id: number; title: string; is_default: boolean;
    full_name: string | null; email: string | null; phone: string | null;
    location: string | null; website: string | null; linkedin: string | null;
    github: string | null; summary: string | null;
    template: string; accent_color: string; section_order: string[] | null;
    experiences: CvExperience[]; educations: CvEducation[];
    skills: CvSkill[]; projects: CvProject[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const PROFICIENCY_LABELS: Record<string, string> = {
    beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", expert: "Expert",
};
const PROFICIENCY_WIDTH: Record<string, string> = {
    beginner: "25%", intermediate: "55%", advanced: "80%", expert: "100%",
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300 bg-white";
const textareaCls = inputCls + " resize-none";

function SaveBtn({ processing }: { processing: boolean }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
            {processing ? "Saving…" : "Save"}
        </button>
    );
}

// ─── Drag-to-reorder hook ─────────────────────────────────────────────────────

function useDragOrder<T extends { id: number }>(
    items: T[],
    onReorder: (ids: number[]) => void
) {
    const dragIdx = useRef<number | null>(null);
    const [list, setList] = useState<T[]>(items);

    const sync = useCallback((fresh: T[]) => setList(fresh), []);

    function onDragStart(i: number) { dragIdx.current = i; }
    function onDragOver(e: React.DragEvent, i: number) {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === i) return;
        const next = [...list];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(i, 0, moved);
        dragIdx.current = i;
        setList(next);
    }
    function onDrop() {
        dragIdx.current = null;
        onReorder(list.map((x) => x.id));
    }

    return { list, sync, onDragStart, onDragOver, onDrop };
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function SectionPanel({
    title, icon, onAdd, children,
}: {
    title: string; icon: React.ReactNode; onAdd?: () => void; children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <span className="text-slate-400">{icon}</span>
                    <h3 className="font-semibold text-slate-800 text-[14px]">{title}</h3>
                </div>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                        </svg>
                        Add
                    </button>
                )}
            </div>
            <div className="p-4 space-y-3">{children}</div>
        </div>
    );
}

// ─── Experience Section ───────────────────────────────────────────────────────

function ExperienceSection({ cv }: { cv: Cv }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);

    const { list, onDragStart, onDragOver, onDrop } = useDragOrder(
        cv.experiences,
        (ids) => router.post(`/cv/${cv.id}/reorder`, { type: "experience", order: ids }, { preserveScroll: true })
    );

    return (
        <SectionPanel
            title="Experience"
            icon={<svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M2 5.5h12v8H2zM5 5.5V4a1 1 0 011-1h4a1 1 0 011 1v1.5"/></svg>}
            onAdd={() => setAdding(true)}
        >
            {list.map((exp, i) => (
                <div
                    key={exp.id}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={(e) => onDragOver(e, i)}
                    onDrop={onDrop}
                    className="group bg-slate-50 border border-slate-100 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-slate-200 transition-colors"
                >
                    {editing === exp.id ? (
                        <ExperienceForm cv={cv} exp={exp} onDone={() => setEditing(null)} />
                    ) : (
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                                <svg className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 4h12v1H2zM2 7.5h12v1H2zM2 11h12v1H2z"/>
                                </svg>
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-800">{exp.job_title}</p>
                                    <p className="text-[12px] text-slate-500">{exp.company_name}{exp.location ? ` · ${exp.location}` : ""}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => setEditing(exp.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/>
                                    </svg>
                                </button>
                                <button onClick={() => router.delete(`/cv/${cv.id}/experiences/${exp.id}`, { preserveScroll: true })} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {adding && <ExperienceForm cv={cv} onDone={() => setAdding(false)} />}
            {list.length === 0 && !adding && (
                <p className="text-[13px] text-slate-400 text-center py-4">No experience added yet</p>
            )}
        </SectionPanel>
    );
}

function ExperienceForm({ cv, exp, onDone }: { cv: Cv; exp?: CvExperience; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        job_title: exp?.job_title ?? "",
        company_name: exp?.company_name ?? "",
        location: exp?.location ?? "",
        description: exp?.description ?? "",
        start_date: exp?.start_date ?? "",
        end_date: exp?.end_date ?? "",
        is_current: exp?.is_current ?? false,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = exp ? `/cv/${cv.id}/experiences/${exp.id}` : `/cv/${cv.id}/experiences`;
        const action = exp ? put : post;
        action(url, { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <Field label="Job Title">
                    <input className={inputCls} value={data.job_title} onChange={(e) => setData("job_title", e.target.value)} placeholder="Software Engineer" required />
                </Field>
                <Field label="Company">
                    <input className={inputCls} value={data.company_name} onChange={(e) => setData("company_name", e.target.value)} placeholder="Acme Inc." required />
                </Field>
            </div>
            <Field label="Location">
                <input className={inputCls} value={data.location} onChange={(e) => setData("location", e.target.value)} placeholder="Addis Ababa, Ethiopia" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                    <input type="date" className={inputCls} value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} required />
                </Field>
                <Field label="End Date">
                    <input type="date" className={inputCls} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} disabled={data.is_current} />
                </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={data.is_current} onChange={(e) => setData("is_current", e.target.checked)} className="rounded" />
                <span className="text-[13px] text-slate-600">Currently working here</span>
            </label>
            <Field label="Description">
                <textarea className={textareaCls} rows={3} value={data.description} onChange={(e) => setData("description", e.target.value)} placeholder="Describe your responsibilities and achievements…" />
            </Field>
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <SaveBtn processing={processing} />
            </div>
        </form>
    );
}

// ─── Education Section ────────────────────────────────────────────────────────

function EducationSection({ cv }: { cv: Cv }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);

    const { list, onDragStart, onDragOver, onDrop } = useDragOrder(
        cv.educations,
        (ids) => router.post(`/cv/${cv.id}/reorder`, { type: "education", order: ids }, { preserveScroll: true })
    );

    return (
        <SectionPanel
            title="Education"
            icon={<svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M8 1.5L1.5 5l6.5 3.5L14.5 5 8 1.5zM1.5 10.5l6.5 3.5 6.5-3.5"/></svg>}
            onAdd={() => setAdding(true)}
        >
            {list.map((edu, i) => (
                <div key={edu.id} draggable onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i)} onDrop={onDrop}
                    className="group bg-slate-50 border border-slate-100 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-slate-200 transition-colors">
                    {editing === edu.id ? (
                        <EducationForm cv={cv} edu={edu} onDone={() => setEditing(null)} />
                    ) : (
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                                <svg className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h12v1H2zM2 7.5h12v1H2zM2 11h12v1H2z"/></svg>
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-800">{edu.degree} in {edu.field_of_study}</p>
                                    <p className="text-[12px] text-slate-500">{edu.institution_name}{edu.location ? ` · ${edu.location}` : ""}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => setEditing(edu.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/></svg>
                                </button>
                                <button onClick={() => router.delete(`/cv/${cv.id}/education/${edu.id}`, { preserveScroll: true })} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"/></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {adding && <EducationForm cv={cv} onDone={() => setAdding(false)} />}
            {list.length === 0 && !adding && <p className="text-[13px] text-slate-400 text-center py-4">No education added yet</p>}
        </SectionPanel>
    );
}

function EducationForm({ cv, edu, onDone }: { cv: Cv; edu?: CvEducation; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        institution_name: edu?.institution_name ?? "",
        degree: edu?.degree ?? "",
        field_of_study: edu?.field_of_study ?? "",
        location: edu?.location ?? "",
        description: edu?.description ?? "",
        start_date: edu?.start_date ?? "",
        end_date: edu?.end_date ?? "",
        is_current: edu?.is_current ?? false,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = edu ? `/cv/${cv.id}/education/${edu.id}` : `/cv/${cv.id}/education`;
        (edu ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
            <Field label="Institution">
                <input className={inputCls} value={data.institution_name} onChange={(e) => setData("institution_name", e.target.value)} placeholder="Addis Ababa University" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Degree">
                    <input className={inputCls} value={data.degree} onChange={(e) => setData("degree", e.target.value)} placeholder="BSc" required />
                </Field>
                <Field label="Field of Study">
                    <input className={inputCls} value={data.field_of_study} onChange={(e) => setData("field_of_study", e.target.value)} placeholder="Computer Science" required />
                </Field>
            </div>
            <Field label="Location">
                <input className={inputCls} value={data.location} onChange={(e) => setData("location", e.target.value)} placeholder="Addis Ababa" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date"><input type="date" className={inputCls} value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} required /></Field>
                <Field label="End Date"><input type="date" className={inputCls} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} disabled={data.is_current} /></Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={data.is_current} onChange={(e) => setData("is_current", e.target.checked)} className="rounded" />
                <span className="text-[13px] text-slate-600">Currently studying here</span>
            </label>
            <Field label="Notes">
                <textarea className={textareaCls} rows={2} value={data.description} onChange={(e) => setData("description", e.target.value)} placeholder="GPA, honours, thesis…" />
            </Field>
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <SaveBtn processing={processing} />
            </div>
        </form>
    );
}

// ─── Skills Section ───────────────────────────────────────────────────────────

function SkillsSection({ cv }: { cv: Cv }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);

    const { list, onDragStart, onDragOver, onDrop } = useDragOrder(
        cv.skills,
        (ids) => router.post(`/cv/${cv.id}/reorder`, { type: "skills", order: ids }, { preserveScroll: true })
    );

    const profColors: Record<string, string> = {
        beginner: "bg-slate-200", intermediate: "bg-blue-400",
        advanced: "bg-blue-600", expert: "bg-violet-600",
    };

    return (
        <SectionPanel
            title="Skills"
            icon={<svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M8 1.5l1.5 4.5h4.5l-3.5 2.5 1 4.5L8 11l-3.5 2.5 1-4.5L2 6.5h4.5z"/></svg>}
            onAdd={() => setAdding(true)}
        >
            <div className="flex flex-wrap gap-2">
                {list.map((skill, i) => (
                    <div
                        key={skill.id}
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={(e) => onDragOver(e, i)}
                        onDrop={onDrop}
                        className="group relative cursor-grab"
                    >
                        {editing === skill.id ? (
                            <div className="w-full">
                                <SkillForm cv={cv} skill={skill} onDone={() => setEditing(null)} />
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-3 py-1.5 transition-colors">
                                <span className="text-[12px] font-medium text-slate-700">{skill.skill_name}</span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${profColors[skill.proficiency_level]}`} />
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                    <button onClick={() => setEditing(skill.id)} className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 transition-colors">
                                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/></svg>
                                    </button>
                                    <button onClick={() => router.delete(`/cv/${cv.id}/skills/${skill.id}`, { preserveScroll: true })} className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-colors">
                                        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8"/></svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {adding && <SkillForm cv={cv} onDone={() => setAdding(false)} />}
            {list.length === 0 && !adding && <p className="text-[13px] text-slate-400 text-center py-4">No skills added yet</p>}
        </SectionPanel>
    );
}

function SkillForm({ cv, skill, onDone }: { cv: Cv; skill?: CvSkill; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        skill_name: skill?.skill_name ?? "",
        proficiency_level: skill?.proficiency_level ?? "intermediate",
        category: skill?.category ?? "",
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = skill ? `/cv/${cv.id}/skills/${skill.id}` : `/cv/${cv.id}/skills`;
        (skill ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3 w-80">
            <div className="grid grid-cols-2 gap-3">
                <Field label="Skill">
                    <input className={inputCls} value={data.skill_name} onChange={(e) => setData("skill_name", e.target.value)} placeholder="React, Python…" required autoFocus />
                </Field>
                <Field label="Level">
                    <select className={inputCls} value={data.proficiency_level} onChange={(e) => setData("proficiency_level", e.target.value as any)}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                    </select>
                </Field>
            </div>
            <Field label="Category (optional)">
                <input className={inputCls} value={data.category} onChange={(e) => setData("category", e.target.value)} placeholder="Frontend, Languages…" />
            </Field>
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onDone} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <SaveBtn processing={processing} />
            </div>
        </form>
    );
}

// ─── Projects Section ─────────────────────────────────────────────────────────

function ProjectsSection({ cv }: { cv: Cv }) {
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);

    const { list, onDragStart, onDragOver, onDrop } = useDragOrder(
        cv.projects,
        (ids) => router.post(`/cv/${cv.id}/reorder`, { type: "projects", order: ids }, { preserveScroll: true })
    );

    return (
        <SectionPanel
            title="Projects"
            icon={<svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M2 3.5h12v9H2zM6 3.5V2h4v1.5"/></svg>}
            onAdd={() => setAdding(true)}
        >
            {list.map((proj, i) => (
                <div key={proj.id} draggable onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i)} onDrop={onDrop}
                    className="group bg-slate-50 border border-slate-100 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-slate-200 transition-colors">
                    {editing === proj.id ? (
                        <ProjectForm cv={cv} proj={proj} onDone={() => setEditing(null)} />
                    ) : (
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                                <svg className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h12v1H2zM2 7.5h12v1H2zM2 11h12v1H2z"/></svg>
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-800">{proj.project_name}</p>
                                    {proj.tech_stack && <p className="text-[11px] text-slate-400 mt-0.5">{proj.tech_stack}</p>}
                                    {proj.url && <a href={proj.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline">{proj.url}</a>}
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => setEditing(proj.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/></svg>
                                </button>
                                <button onClick={() => router.delete(`/cv/${cv.id}/projects/${proj.id}`, { preserveScroll: true })} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4"/></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {adding && <ProjectForm cv={cv} onDone={() => setAdding(false)} />}
            {list.length === 0 && !adding && <p className="text-[13px] text-slate-400 text-center py-4">No projects added yet</p>}
        </SectionPanel>
    );
}

function ProjectForm({ cv, proj, onDone }: { cv: Cv; proj?: CvProject; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        project_name: proj?.project_name ?? "",
        description: proj?.description ?? "",
        url: proj?.url ?? "",
        tech_stack: proj?.tech_stack ?? "",
        start_date: proj?.start_date ?? "",
        end_date: proj?.end_date ?? "",
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = proj ? `/cv/${cv.id}/projects/${proj.id}` : `/cv/${cv.id}/projects`;
        (proj ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
            <Field label="Project Name">
                <input className={inputCls} value={data.project_name} onChange={(e) => setData("project_name", e.target.value)} placeholder="My Awesome Project" required autoFocus />
            </Field>
            <Field label="Tech Stack">
                <input className={inputCls} value={data.tech_stack} onChange={(e) => setData("tech_stack", e.target.value)} placeholder="React, Laravel, PostgreSQL" />
            </Field>
            <Field label="URL">
                <input type="url" className={inputCls} value={data.url} onChange={(e) => setData("url", e.target.value)} placeholder="https://github.com/…" />
            </Field>
            <Field label="Description">
                <textarea className={textareaCls} rows={3} value={data.description} onChange={(e) => setData("description", e.target.value)} placeholder="What did you build and what problem did it solve?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date"><input type="date" className={inputCls} value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} /></Field>
                <Field label="End Date"><input type="date" className={inputCls} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} /></Field>
            </div>
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <SaveBtn processing={processing} />
            </div>
        </form>
    );
}

// ─── Personal Info Section ────────────────────────────────────────────────────

function PersonalSection({ cv }: { cv: Cv }) {
    const { data, setData, put, processing } = useForm({
        full_name: cv.full_name ?? "",
        email: cv.email ?? "",
        phone: cv.phone ?? "",
        location: cv.location ?? "",
        website: cv.website ?? "",
        linkedin: cv.linkedin ?? "",
        github: cv.github ?? "",
        summary: cv.summary ?? "",
    });

    return (
        <SectionPanel
            title="Personal Info"
            icon={<svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path strokeLinecap="round" d="M2.5 13.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/></svg>}
        >
            <form
                onSubmit={(e) => { e.preventDefault(); put(`/cv/${cv.id}`, { preserveScroll: true }); }}
                className="space-y-3"
            >
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Full Name">
                        <input className={inputCls} value={data.full_name} onChange={(e) => setData("full_name", e.target.value)} placeholder="Biruk Lemma" />
                    </Field>
                    <Field label="Email">
                        <input type="email" className={inputCls} value={data.email} onChange={(e) => setData("email", e.target.value)} placeholder="you@example.com" />
                    </Field>
                    <Field label="Phone">
                        <input className={inputCls} value={data.phone} onChange={(e) => setData("phone", e.target.value)} placeholder="+251 9xx xxx xxx" />
                    </Field>
                    <Field label="Location">
                        <input className={inputCls} value={data.location} onChange={(e) => setData("location", e.target.value)} placeholder="Addis Ababa, Ethiopia" />
                    </Field>
                    <Field label="Website">
                        <input className={inputCls} value={data.website} onChange={(e) => setData("website", e.target.value)} placeholder="https://yoursite.com" />
                    </Field>
                    <Field label="LinkedIn">
                        <input className={inputCls} value={data.linkedin} onChange={(e) => setData("linkedin", e.target.value)} placeholder="linkedin.com/in/yourname" />
                    </Field>
                    <Field label="GitHub">
                        <input className={inputCls} value={data.github} onChange={(e) => setData("github", e.target.value)} placeholder="github.com/yourname" />
                    </Field>
                </div>
                <Field label="Professional Summary">
                    <textarea className={textareaCls} rows={4} value={data.summary} onChange={(e) => setData("summary", e.target.value)} placeholder="A concise paragraph about who you are and what you bring to the table…" />
                </Field>
                <div className="flex justify-end">
                    <SaveBtn processing={processing} />
                </div>
            </form>
        </SectionPanel>
    );
}

// ─── CV Preview ───────────────────────────────────────────────────────────────

function CvPreview({ cv }: { cv: Cv }) {
    const accent = cv.accent_color || "#2563eb";

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-[11px] leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: `3px solid ${accent}` }}>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                    {cv.full_name || "Your Name"}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-slate-500 text-[10px]">
                    {cv.email && <span>✉ {cv.email}</span>}
                    {cv.phone && <span>📞 {cv.phone}</span>}
                    {cv.location && <span>📍 {cv.location}</span>}
                    {cv.website && <span>🌐 {cv.website}</span>}
                    {cv.linkedin && <span>in {cv.linkedin}</span>}
                    {cv.github && <span>⌥ {cv.github}</span>}
                </div>
                {cv.summary && (
                    <p className="mt-3 text-slate-600 text-[11px] leading-relaxed">{cv.summary}</p>
                )}
            </div>

            <div className="px-6 py-4 space-y-5">
                {/* Experience */}
                {cv.experiences.length > 0 && (
                    <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Experience</h2>
                        <div className="space-y-3">
                            {cv.experiences.map((exp) => (
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

                {/* Education */}
                {cv.educations.length > 0 && (
                    <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Education</h2>
                        <div className="space-y-3">
                            {cv.educations.map((edu) => (
                                <div key={edu.id}>
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-bold text-slate-800 text-[12px]">{edu.degree} in {edu.field_of_study}</p>
                                        <p className="text-slate-400 text-[10px] shrink-0 ml-2">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p>
                                    </div>
                                    <p className="text-slate-500 text-[10px]">{edu.institution_name}{edu.location ? ` · ${edu.location}` : ""}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Skills */}
                {cv.skills.length > 0 && (
                    <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Skills</h2>
                        <div className="flex flex-wrap gap-1.5">
                            {cv.skills.map((skill) => (
                                <span key={skill.id} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{skill.skill_name}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects */}
                {cv.projects.length > 0 && (
                    <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: accent }}>Projects</h2>
                        <div className="space-y-2">
                            {cv.projects.map((proj) => (
                                <div key={proj.id}>
                                    <p className="font-bold text-slate-800 text-[12px]">{proj.project_name}</p>
                                    {proj.tech_stack && <p className="text-slate-400 text-[10px]">{proj.tech_stack}</p>}
                                    {proj.description && <p className="text-slate-600 text-[10px] mt-0.5">{proj.description}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Show Page ───────────────────────────────────────────────────────────

export default function Show({ cv }: { cv: Cv }) {
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
    const titleForm = useForm({ title: cv.title });

    const sectionOrder = cv.section_order ?? ["experience", "education", "skills", "projects"];

    const sectionMap: Record<string, React.ReactNode> = {
        experience: <ExperienceSection cv={cv} />,
        education: <EducationSection cv={cv} />,
        skills: <SkillsSection cv={cv} />,
        projects: <ProjectsSection cv={cv} />,
    };

    return (
        <AppLayout>
            <Head title={cv.title} />

            <div className="flex flex-col h-full">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <a href="/cv" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd"/>
                            </svg>
                            My CVs
                        </a>
                        <span className="text-slate-200">/</span>
                        <input
                            className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none px-1 py-0.5 transition-colors"
                            value={titleForm.data.title}
                            onChange={(e) => titleForm.setData("title", e.target.value)}
                            onBlur={() => titleForm.put(`/cv/${cv.id}`, { preserveScroll: true })}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Tab toggle */}
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                            {(["edit", "preview"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors capitalize ${activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {activeTab === "edit" ? (
                        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
                            <PersonalSection cv={cv} />
                            {sectionOrder.map((key) => (
                                <div key={key}>{sectionMap[key]}</div>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto px-6 py-6">
                            <CvPreview cv={cv} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}