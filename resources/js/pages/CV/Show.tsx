import AppLayout from "@/layouts/app-layout";
import { Head, router, useForm } from "@inertiajs/react";
import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AiCvSummaryDrawer from "@/components/ai-cv-summary-drawer";

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
    template: string; accent_color: string | null;
    photo_path: string | null; photo_url: string | null;
    section_order: string[] | null;
    updated_at: string;
    experiences: CvExperience[]; educations: CvEducation[];
    skills: CvSkill[]; projects: CvProject[];
}

type SectionKey = "experience" | "education" | "skills" | "projects";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const PROFICIENCY_WIDTH: Record<string, number> = {
    beginner: 25, intermediate: 55, advanced: 80, expert: 100,
};

// ─── Inline Editable Text ─────────────────────────────────────────────────────

function EditableText({
    value, onSave, className = "", placeholder = "Click to edit",
    style, tag: Tag = "span",
}: {
    value: string; onSave: (v: string) => void;
    className?: string; placeholder?: string;
    style?: React.CSSProperties; tag?: "span" | "h1" | "h2" | "p";
}) {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);

    if (editing) {
        return (
            <input
                autoFocus
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={() => { onSave(local); setEditing(false); }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") { onSave(local); setEditing(false); }
                    if (e.key === "Escape") { setLocal(value); setEditing(false); }
                }}
                className={`bg-blue-50 border-b-2 border-blue-400 outline-none w-full text-slate-800 ${className}`}
                style={style}
            />
        );
    }

    return (
        <Tag
            onClick={() => setEditing(true)}
            title="Click to edit"
            className={`cursor-text hover:bg-blue-50/60 rounded transition-colors ${!value ? "opacity-40 italic" : ""} ${className}`}
            style={style}
        >
            {value || placeholder}
        </Tag>
    );
}

function EditableArea({
    value, onSave, className = "", placeholder = "Click to edit", rows = 3, style,
}: {
    value: string; onSave: (v: string) => void;
    className?: string; placeholder?: string; rows?: number;
    style?: React.CSSProperties;
}) {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);

    if (editing) {
        return (
            <textarea
                autoFocus
                value={local}
                rows={rows}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={() => { onSave(local); setEditing(false); }}
                className={`w-full bg-blue-50 border border-blue-300 rounded outline-none resize-none p-1 text-slate-800 ${className}`}
                style={style}
            />
        );
    }

    return (
        <p
            onClick={() => setEditing(true)}
            title="Click to edit"
            className={`cursor-text whitespace-pre-wrap hover:bg-blue-50/60 rounded transition-colors ${!value ? "opacity-40 italic" : ""} ${className}`}
            style={style}
        >
            {value || placeholder}
        </p>
    );
}

// ─── Form input style ─────────────────────────────────────────────────────────
// text-slate-800 ensures visible text even when rendered inside dark sidebar contexts
const inp = "w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 bg-white placeholder:text-slate-400";

// ─── Inline Section Forms ─────────────────────────────────────────────────────

function ExperienceForm({ cvId, exp, onDone }: { cvId: number; exp?: CvExperience; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        job_title: exp?.job_title ?? "", company_name: exp?.company_name ?? "",
        location: exp?.location ?? "", description: exp?.description ?? "",
        start_date: exp?.start_date ?? "", end_date: exp?.end_date ?? "",
        is_current: exp?.is_current ?? false,
    });
    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = exp ? `/cv/${cvId}/experiences/${exp.id}` : `/cv/${cvId}/experiences`;
        (exp ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }
    return (
        <form onSubmit={submit} className="no-print bg-white border-2 border-blue-200 rounded-xl p-3 space-y-2 my-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
                <input className={inp} placeholder="Job Title *" value={data.job_title} onChange={(e) => setData("job_title", e.target.value)} required />
                <input className={inp} placeholder="Company *" value={data.company_name} onChange={(e) => setData("company_name", e.target.value)} required />
            </div>
            <input className={inp} placeholder="Location" value={data.location} onChange={(e) => setData("location", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
                <input type="date" className={inp} value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} required />
                <input type="date" className={inp} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} disabled={data.is_current} />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input type="checkbox" checked={data.is_current} onChange={(e) => setData("is_current", e.target.checked)} />
                Currently working here
            </label>
            <textarea className={inp + " resize-none"} rows={2} placeholder="Description…" value={data.description} onChange={(e) => setData("description", e.target.value)} />
            <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={processing} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {processing ? "Saving…" : "Save"}
                </button>
            </div>
        </form>
    );
}

function EducationForm({ cvId, edu, onDone }: { cvId: number; edu?: CvEducation; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        institution_name: edu?.institution_name ?? "", degree: edu?.degree ?? "",
        field_of_study: edu?.field_of_study ?? "", location: edu?.location ?? "",
        description: edu?.description ?? "", start_date: edu?.start_date ?? "",
        end_date: edu?.end_date ?? "", is_current: edu?.is_current ?? false,
    });
    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = edu ? `/cv/${cvId}/education/${edu.id}` : `/cv/${cvId}/education`;
        (edu ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }
    return (
        <form onSubmit={submit} className="no-print bg-white border-2 border-blue-200 rounded-xl p-3 space-y-2 my-2 shadow-sm">
            <input className={inp} placeholder="Institution *" value={data.institution_name} onChange={(e) => setData("institution_name", e.target.value)} required />
            <div className="grid grid-cols-2 gap-2">
                <input className={inp} placeholder="Degree *" value={data.degree} onChange={(e) => setData("degree", e.target.value)} required />
                <input className={inp} placeholder="Field of Study *" value={data.field_of_study} onChange={(e) => setData("field_of_study", e.target.value)} required />
            </div>
            <input className={inp} placeholder="Location" value={data.location} onChange={(e) => setData("location", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
                <input type="date" className={inp} value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} required />
                <input type="date" className={inp} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} disabled={data.is_current} />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input type="checkbox" checked={data.is_current} onChange={(e) => setData("is_current", e.target.checked)} />
                Currently studying here
            </label>
            <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={processing} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {processing ? "Saving…" : "Save"}
                </button>
            </div>
        </form>
    );
}

function SkillForm({ cvId, skill, onDone }: { cvId: number; skill?: CvSkill; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        skill_name: skill?.skill_name ?? "",
        proficiency_level: skill?.proficiency_level ?? "intermediate",
        category: skill?.category ?? "",
    });
    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = skill ? `/cv/${cvId}/skills/${skill.id}` : `/cv/${cvId}/skills`;
        (skill ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }
    return (
        <form onSubmit={submit} className="no-print bg-white border-2 border-blue-200 rounded-xl p-3 space-y-2 my-2 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
                <input className={inp} placeholder="Skill name *" value={data.skill_name} onChange={(e) => setData("skill_name", e.target.value)} required autoFocus />
                <select className={inp} value={data.proficiency_level} onChange={(e) => setData("proficiency_level", e.target.value as any)}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                </select>
            </div>
            <input className={inp} placeholder="Category (optional)" value={data.category} onChange={(e) => setData("category", e.target.value)} />
            <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={processing} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {processing ? "Saving…" : "Save"}
                </button>
            </div>
        </form>
    );
}

function ProjectForm({ cvId, proj, onDone }: { cvId: number; proj?: CvProject; onDone: () => void }) {
    const { data, setData, post, put, processing } = useForm({
        project_name: proj?.project_name ?? "", description: proj?.description ?? "",
        url: proj?.url ?? "", tech_stack: proj?.tech_stack ?? "",
        start_date: proj?.start_date ?? "", end_date: proj?.end_date ?? "",
    });
    function submit(e: React.FormEvent) {
        e.preventDefault();
        const url = proj ? `/cv/${cvId}/projects/${proj.id}` : `/cv/${cvId}/projects`;
        (proj ? put : post)(url, { preserveScroll: true, onSuccess: onDone });
    }
    return (
        <form onSubmit={submit} className="no-print bg-white border-2 border-blue-200 rounded-xl p-3 space-y-2 my-2 shadow-sm">
            <input className={inp} placeholder="Project name *" value={data.project_name} onChange={(e) => setData("project_name", e.target.value)} required autoFocus />
            <input className={inp} placeholder="Tech stack (e.g. React, Laravel)" value={data.tech_stack} onChange={(e) => setData("tech_stack", e.target.value)} />
            <input type="url" className={inp} placeholder="URL (optional)" value={data.url} onChange={(e) => setData("url", e.target.value)} />
            <textarea className={inp + " resize-none"} rows={2} placeholder="Description…" value={data.description} onChange={(e) => setData("description", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
                <input type="date" className={inp} value={data.start_date ?? ""} onChange={(e) => setData("start_date", e.target.value)} />
                <input type="date" className={inp} value={data.end_date ?? ""} onChange={(e) => setData("end_date", e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={onDone} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={processing} className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {processing ? "Saving…" : "Save"}
                </button>
            </div>
        </form>
    );
}

// ─── Shared inline editing controls ──────────────────────────────────────────

function EntryControls({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="no-print absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 shadow text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z" /></svg>
            </button>
            <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 shadow text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
        </div>
    );
}

function AddEntryBtn({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="no-print w-full mt-2 py-1.5 border border-dashed border-slate-200 hover:border-blue-300 text-slate-300 hover:text-blue-400 text-[10px] rounded-lg transition-all flex items-center justify-center gap-1"
        >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1a.5.5 0 01.5.5v4h4a.5.5 0 010 1h-4v4a.5.5 0 01-1 0v-4h-4a.5.5 0 010-1h4v-4A.5.5 0 016 1z" /></svg>
            {label}
        </button>
    );
}

// ─── Template props interface ─────────────────────────────────────────────────

interface TemplateProps {
    cv: Cv;
    photoSrc: string | null;          // local preview OR server URL
    onField: (field: string, value: string) => void;
    editing: { section: string; id: number } | null;
    setEditing: (e: { section: string; id: number } | null) => void;
    adding: SectionKey | null;
    setAdding: (s: SectionKey | null) => void;
    onPhotoUpload: (file: File) => void;
}

// ─── Template: Classic ────────────────────────────────────────────────────────

function ClassicTemplate({ cv, onField, editing, setEditing, adding, setAdding }: TemplateProps) {
    const accent = cv.accent_color || "#2563eb";
    return (
        <div className="bg-white font-[Georgia,serif] text-[11px] leading-relaxed text-slate-800" style={{ minHeight: "1123px" }}>
            <div className="px-10 pt-10 pb-5">
                <EditableText tag="h1" value={cv.full_name || ""} onSave={(v) => onField("full_name", v)}
                    placeholder="Your Name" className="text-3xl font-bold tracking-tight text-slate-900 block w-full" />
                <div className="flex flex-wrap gap-x-5 gap-y-0.5 mt-2 text-[10px] text-slate-500">
                    {["email", "phone", "location", "website", "linkedin", "github"].map((f) => (
                        <EditableText key={f} value={(cv as any)[f] || ""} onSave={(v) => onField(f, v)} placeholder={f} className="hover:text-slate-700" />
                    ))}
                </div>
                <div style={{ borderBottom: `2.5px solid ${accent}` }} className="mt-4" />
                <EditableArea value={cv.summary || ""} onSave={(v) => onField("summary", v)}
                    placeholder="Add a professional summary…" rows={2} className="mt-3 text-slate-600 text-[10.5px]" />
            </div>

            <div className="px-10 pb-10 space-y-6">
                {(cv.experiences.length > 0 || adding === "experience") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Experience</h2>
                        <div className="space-y-3">
                            {cv.experiences.map((exp) =>
                                editing?.section === "experience" && editing.id === exp.id ? (
                                    <ExperienceForm key={exp.id} cvId={cv.id} exp={exp} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={exp.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "experience", id: exp.id })} onDelete={() => router.delete(`/cv/${cv.id}/experiences/${exp.id}`, { preserveScroll: true })} />
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-bold text-slate-800 text-[11px]">{exp.job_title}</p>
                                            <p className="text-slate-400 text-[10px] shrink-0 ml-2">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p>
                                        </div>
                                        <p className="text-slate-500 text-[10px]">{exp.company_name}{exp.location ? ` · ${exp.location}` : ""}</p>
                                        {exp.description && <p className="text-slate-600 text-[10px] mt-1">{exp.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "experience" && <ExperienceForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add experience" onClick={() => setAdding("experience")} />
                    </div>
                )}
                {cv.experiences.length === 0 && adding !== "experience" && <AddEntryBtn label="+ Add experience" onClick={() => setAdding("experience")} />}

                {(cv.educations.length > 0 || adding === "education") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Education</h2>
                        <div className="space-y-3">
                            {cv.educations.map((edu) =>
                                editing?.section === "education" && editing.id === edu.id ? (
                                    <EducationForm key={edu.id} cvId={cv.id} edu={edu} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={edu.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "education", id: edu.id })} onDelete={() => router.delete(`/cv/${cv.id}/education/${edu.id}`, { preserveScroll: true })} />
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-bold text-[11px]">{edu.degree} in {edu.field_of_study}</p>
                                            <p className="text-slate-400 text-[10px] shrink-0 ml-2">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p>
                                        </div>
                                        <p className="text-slate-500 text-[10px]">{edu.institution_name}{edu.location ? ` · ${edu.location}` : ""}</p>
                                    </div>
                                )
                            )}
                            {adding === "education" && <EducationForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add education" onClick={() => setAdding("education")} />
                    </div>
                )}
                {cv.educations.length === 0 && adding !== "education" && <AddEntryBtn label="+ Add education" onClick={() => setAdding("education")} />}

                {(cv.skills.length > 0 || adding === "skills") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {cv.skills.map((skill) =>
                                editing?.section === "skills" && editing.id === skill.id ? (
                                    <SkillForm key={skill.id} cvId={cv.id} skill={skill} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={skill.id} className="relative group flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                                        <span className="text-[10px] font-medium text-slate-700">{skill.skill_name}</span>
                                        <div className="no-print flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditing({ section: "skills", id: skill.id })} className="text-slate-300 hover:text-blue-500 transition-colors"><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z" /></svg></button>
                                            <button onClick={() => router.delete(`/cv/${cv.id}/skills/${skill.id}`, { preserveScroll: true })} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" /></svg></button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                        {adding === "skills" && <SkillForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        <AddEntryBtn label="Add skill" onClick={() => setAdding("skills")} />
                    </div>
                )}
                {cv.skills.length === 0 && adding !== "skills" && <AddEntryBtn label="+ Add skills" onClick={() => setAdding("skills")} />}

                {(cv.projects.length > 0 || adding === "projects") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Projects</h2>
                        <div className="space-y-3">
                            {cv.projects.map((proj) =>
                                editing?.section === "projects" && editing.id === proj.id ? (
                                    <ProjectForm key={proj.id} cvId={cv.id} proj={proj} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={proj.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "projects", id: proj.id })} onDelete={() => router.delete(`/cv/${cv.id}/projects/${proj.id}`, { preserveScroll: true })} />
                                        <p className="font-bold text-[11px]">{proj.project_name}</p>
                                        {proj.tech_stack && <p className="text-slate-400 text-[10px]">{proj.tech_stack}</p>}
                                        {proj.description && <p className="text-slate-600 text-[10px] mt-0.5">{proj.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "projects" && <ProjectForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add project" onClick={() => setAdding("projects")} />
                    </div>
                )}
                {cv.projects.length === 0 && adding !== "projects" && <AddEntryBtn label="+ Add projects" onClick={() => setAdding("projects")} />}
            </div>
        </div>
    );
}

// ─── Template: Modern ────────────────────────────────────────────────────────

function ModernTemplate({ cv, onField, editing, setEditing, adding, setAdding }: TemplateProps) {
    const accent = cv.accent_color || "#7c3aed";
    return (
        <div className="bg-white flex text-[11px] leading-relaxed" style={{ minHeight: "1123px" }}>
            <div className="w-[220px] shrink-0 flex flex-col gap-4 px-5 py-8" style={{ backgroundColor: accent }}>
                <EditableText tag="h1" value={cv.full_name || ""} onSave={(v) => onField("full_name", v)}
                    placeholder="Your Name" className="text-xl font-bold text-white leading-tight block" />
                <div className="border-t border-white/20 pt-4 space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-2">Contact</p>
                    {["email", "phone", "location", "website", "linkedin", "github"].map((f) => (
                        <EditableText key={f} value={(cv as any)[f] || ""} onSave={(v) => onField(f, v)} placeholder={f} className="text-white/80 text-[10px] block" />
                    ))}
                </div>
                {(cv.skills.length > 0 || adding === "skills") && (
                    <div className="border-t border-white/20 pt-4">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-3">Skills</p>
                        <div className="space-y-2">
                            {cv.skills.map((skill) =>
                                editing?.section === "skills" && editing.id === skill.id ? (
                                    <SkillForm key={skill.id} cvId={cv.id} skill={skill} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={skill.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "skills", id: skill.id })} onDelete={() => router.delete(`/cv/${cv.id}/skills/${skill.id}`, { preserveScroll: true })} />
                                        <p className="text-[10px] text-white/80">{skill.skill_name}</p>
                                        <div className="h-1 bg-white/10 rounded-full mt-0.5"><div className="h-1 bg-white/60 rounded-full" style={{ width: `${PROFICIENCY_WIDTH[skill.proficiency_level]}%` }} /></div>
                                    </div>
                                )
                            )}
                            {adding === "skills" && <SkillForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add skill" onClick={() => setAdding("skills")} />
                    </div>
                )}
                {cv.skills.length === 0 && adding !== "skills" && <AddEntryBtn label="+ Skills" onClick={() => setAdding("skills")} />}
            </div>
            <div className="flex-1 px-8 py-8 space-y-6">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: accent }}>Summary</h2>
                    <EditableArea value={cv.summary || ""} onSave={(v) => onField("summary", v)} placeholder="Add a professional summary…" rows={2} className="text-slate-600 text-[10.5px]" />
                </div>
                {(cv.experiences.length > 0 || adding === "experience") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Experience</h2>
                        <div className="space-y-4">
                            {cv.experiences.map((exp) =>
                                editing?.section === "experience" && editing.id === exp.id ? (
                                    <ExperienceForm key={exp.id} cvId={cv.id} exp={exp} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={exp.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "experience", id: exp.id })} onDelete={() => router.delete(`/cv/${cv.id}/experiences/${exp.id}`, { preserveScroll: true })} />
                                        <div className="flex justify-between"><p className="font-bold text-slate-800 text-[11px]">{exp.job_title}</p><p className="text-slate-400 text-[10px]">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p></div>
                                        <p className="text-slate-500 text-[10px]">{exp.company_name}{exp.location ? ` · ${exp.location}` : ""}</p>
                                        {exp.description && <p className="text-slate-600 text-[10px] mt-1">{exp.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "experience" && <ExperienceForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add experience" onClick={() => setAdding("experience")} />
                    </div>
                )}
                {cv.experiences.length === 0 && adding !== "experience" && <AddEntryBtn label="+ Add experience" onClick={() => setAdding("experience")} />}
                {(cv.educations.length > 0 || adding === "education") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Education</h2>
                        <div className="space-y-3">
                            {cv.educations.map((edu) =>
                                editing?.section === "education" && editing.id === edu.id ? (
                                    <EducationForm key={edu.id} cvId={cv.id} edu={edu} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={edu.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "education", id: edu.id })} onDelete={() => router.delete(`/cv/${cv.id}/education/${edu.id}`, { preserveScroll: true })} />
                                        <div className="flex justify-between"><p className="font-bold text-[11px]">{edu.degree} in {edu.field_of_study}</p><p className="text-slate-400 text-[10px]">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p></div>
                                        <p className="text-slate-500 text-[10px]">{edu.institution_name}</p>
                                    </div>
                                )
                            )}
                            {adding === "education" && <EducationForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add education" onClick={() => setAdding("education")} />
                    </div>
                )}
                {cv.educations.length === 0 && adding !== "education" && <AddEntryBtn label="+ Add education" onClick={() => setAdding("education")} />}
                {(cv.projects.length > 0 || adding === "projects") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: accent }}>Projects</h2>
                        <div className="space-y-3">
                            {cv.projects.map((proj) =>
                                editing?.section === "projects" && editing.id === proj.id ? (
                                    <ProjectForm key={proj.id} cvId={cv.id} proj={proj} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={proj.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "projects", id: proj.id })} onDelete={() => router.delete(`/cv/${cv.id}/projects/${proj.id}`, { preserveScroll: true })} />
                                        <p className="font-bold text-[11px]">{proj.project_name}</p>
                                        {proj.tech_stack && <p className="text-slate-400 text-[10px]">{proj.tech_stack}</p>}
                                        {proj.description && <p className="text-slate-600 text-[10px] mt-0.5">{proj.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "projects" && <ProjectForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add project" onClick={() => setAdding("projects")} />
                    </div>
                )}
                {cv.projects.length === 0 && adding !== "projects" && <AddEntryBtn label="+ Add projects" onClick={() => setAdding("projects")} />}
            </div>
        </div>
    );
}

// ─── Template: Minimal ────────────────────────────────────────────────────────

function MinimalTemplate({ cv, onField, editing, setEditing, adding, setAdding }: TemplateProps) {
    const accent = cv.accent_color || "#0f766e";
    return (
        <div className="bg-white text-[11px] leading-relaxed px-14 py-12" style={{ minHeight: "1123px" }}>
            <EditableText tag="h1" value={cv.full_name || ""} onSave={(v) => onField("full_name", v)}
                placeholder="Your Name" className="text-4xl font-light tracking-wide text-slate-900 block" />
            <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-2 text-[10px] text-slate-400 border-b border-slate-200 pb-4">
                {["email", "phone", "location", "website", "linkedin"].map((f) => (
                    <EditableText key={f} value={(cv as any)[f] || ""} onSave={(v) => onField(f, v)} placeholder={f} />
                ))}
            </div>
            <div className="mt-6">
                <EditableArea value={cv.summary || ""} onSave={(v) => onField("summary", v)} placeholder="Add a professional summary…" rows={2} className="text-slate-500 text-[10.5px] italic" />
            </div>
            {(cv.experiences.length > 0 || adding === "experience") && (
                <div className="mt-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: accent }}>Experience</p>
                    <div className="space-y-4">
                        {cv.experiences.map((exp) =>
                            editing?.section === "experience" && editing.id === exp.id ? (
                                <ExperienceForm key={exp.id} cvId={cv.id} exp={exp} onDone={() => setEditing(null)} />
                            ) : (
                                <div key={exp.id} className="relative group pl-4 border-l-2 border-slate-100">
                                    <EntryControls onEdit={() => setEditing({ section: "experience", id: exp.id })} onDelete={() => router.delete(`/cv/${cv.id}/experiences/${exp.id}`, { preserveScroll: true })} />
                                    <div className="flex justify-between"><p className="font-semibold text-slate-800">{exp.job_title}</p><p className="text-slate-300 text-[10px]">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p></div>
                                    <p className="text-slate-400 text-[10px]">{exp.company_name}{exp.location ? `, ${exp.location}` : ""}</p>
                                    {exp.description && <p className="text-slate-500 text-[10px] mt-1">{exp.description}</p>}
                                </div>
                            )
                        )}
                        {adding === "experience" && <ExperienceForm cvId={cv.id} onDone={() => setAdding(null)} />}
                    </div>
                    <AddEntryBtn label="Add experience" onClick={() => setAdding("experience")} />
                </div>
            )}
            {cv.experiences.length === 0 && adding !== "experience" && <AddEntryBtn label="+ Add experience" onClick={() => setAdding("experience")} />}
            {(cv.educations.length > 0 || adding === "education") && (
                <div className="mt-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: accent }}>Education</p>
                    <div className="space-y-4">
                        {cv.educations.map((edu) =>
                            editing?.section === "education" && editing.id === edu.id ? (
                                <EducationForm key={edu.id} cvId={cv.id} edu={edu} onDone={() => setEditing(null)} />
                            ) : (
                                <div key={edu.id} className="relative group pl-4 border-l-2 border-slate-100">
                                    <EntryControls onEdit={() => setEditing({ section: "education", id: edu.id })} onDelete={() => router.delete(`/cv/${cv.id}/education/${edu.id}`, { preserveScroll: true })} />
                                    <div className="flex justify-between"><p className="font-semibold text-slate-800">{edu.degree} · {edu.field_of_study}</p><p className="text-slate-300 text-[10px]">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p></div>
                                    <p className="text-slate-400 text-[10px]">{edu.institution_name}</p>
                                </div>
                            )
                        )}
                        {adding === "education" && <EducationForm cvId={cv.id} onDone={() => setAdding(null)} />}
                    </div>
                    <AddEntryBtn label="Add education" onClick={() => setAdding("education")} />
                </div>
            )}
            {cv.educations.length === 0 && adding !== "education" && <AddEntryBtn label="+ Add education" onClick={() => setAdding("education")} />}
            {(cv.skills.length > 0 || adding === "skills") && (
                <div className="mt-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: accent }}>Skills</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                        {cv.skills.map((skill) =>
                            editing?.section === "skills" && editing.id === skill.id ? (
                                <SkillForm key={skill.id} cvId={cv.id} skill={skill} onDone={() => setEditing(null)} />
                            ) : (
                                <div key={skill.id} className="relative group flex items-center gap-1">
                                    <EntryControls onEdit={() => setEditing({ section: "skills", id: skill.id })} onDelete={() => router.delete(`/cv/${cv.id}/skills/${skill.id}`, { preserveScroll: true })} />
                                    <span className="text-[10px] text-slate-500 border-b border-slate-200">{skill.skill_name}</span>
                                </div>
                            )
                        )}
                    </div>
                    {adding === "skills" && <SkillForm cvId={cv.id} onDone={() => setAdding(null)} />}
                    <AddEntryBtn label="Add skill" onClick={() => setAdding("skills")} />
                </div>
            )}
            {cv.skills.length === 0 && adding !== "skills" && <AddEntryBtn label="+ Add skills" onClick={() => setAdding("skills")} />}
            {(cv.projects.length > 0 || adding === "projects") && (
                <div className="mt-8">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: accent }}>Projects</p>
                    <div className="space-y-3">
                        {cv.projects.map((proj) =>
                            editing?.section === "projects" && editing.id === proj.id ? (
                                <ProjectForm key={proj.id} cvId={cv.id} proj={proj} onDone={() => setEditing(null)} />
                            ) : (
                                <div key={proj.id} className="relative group pl-4 border-l-2 border-slate-100">
                                    <EntryControls onEdit={() => setEditing({ section: "projects", id: proj.id })} onDelete={() => router.delete(`/cv/${cv.id}/projects/${proj.id}`, { preserveScroll: true })} />
                                    <p className="font-semibold text-slate-800">{proj.project_name}</p>
                                    {proj.tech_stack && <p className="text-slate-400 text-[10px]">{proj.tech_stack}</p>}
                                    {proj.description && <p className="text-slate-500 text-[10px] mt-0.5">{proj.description}</p>}
                                </div>
                            )
                        )}
                        {adding === "projects" && <ProjectForm cvId={cv.id} onDone={() => setAdding(null)} />}
                    </div>
                    <AddEntryBtn label="Add project" onClick={() => setAdding("projects")} />
                </div>
            )}
            {cv.projects.length === 0 && adding !== "projects" && <AddEntryBtn label="+ Add projects" onClick={() => setAdding("projects")} />}
        </div>
    );
}

// ─── Template: Executive ─────────────────────────────────────────────────────

function ExecutiveTemplate({ cv, onField, editing, setEditing, adding, setAdding }: TemplateProps) {
    const accent = cv.accent_color || "#1e293b";
    return (
        <div className="bg-white text-[11px] leading-relaxed" style={{ minHeight: "1123px" }}>
            <div className="px-10 py-8" style={{ backgroundColor: accent }}>
                <EditableText tag="h1" value={cv.full_name || ""} onSave={(v) => onField("full_name", v)} placeholder="Your Name" className="text-4xl font-bold tracking-tight text-white block" />
                <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-3 text-[10px] text-white/60">
                    {["email", "phone", "location", "website", "linkedin", "github"].map((f) => (
                        <EditableText key={f} value={(cv as any)[f] || ""} onSave={(v) => onField(f, v)} placeholder={f} className="text-white/60" />
                    ))}
                </div>
            </div>
            <div className="px-10 py-8 space-y-6">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2 pb-1 border-b-2" style={{ color: accent, borderColor: accent }}>Summary</h2>
                    <EditableArea value={cv.summary || ""} onSave={(v) => onField("summary", v)} placeholder="Add a professional summary…" rows={2} className="text-slate-600 mt-2" />
                </div>
                {(cv.experiences.length > 0 || adding === "experience") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3 pb-1 border-b-2" style={{ color: accent, borderColor: accent }}>Experience</h2>
                        <div className="space-y-4 mt-3">
                            {cv.experiences.map((exp) =>
                                editing?.section === "experience" && editing.id === exp.id ? (
                                    <ExperienceForm key={exp.id} cvId={cv.id} exp={exp} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={exp.id} className="relative group grid grid-cols-[1fr_auto] gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900">{exp.job_title}</p>
                                            <p className="text-slate-500 text-[10px]">{exp.company_name}{exp.location ? ` · ${exp.location}` : ""}</p>
                                            {exp.description && <p className="text-slate-600 text-[10px] mt-1">{exp.description}</p>}
                                        </div>
                                        <p className="text-slate-400 text-[10px] whitespace-nowrap text-right">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p>
                                        <EntryControls onEdit={() => setEditing({ section: "experience", id: exp.id })} onDelete={() => router.delete(`/cv/${cv.id}/experiences/${exp.id}`, { preserveScroll: true })} />
                                    </div>
                                )
                            )}
                            {adding === "experience" && <ExperienceForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add experience" onClick={() => setAdding("experience")} />
                    </div>
                )}
                {cv.experiences.length === 0 && adding !== "experience" && <AddEntryBtn label="+ Add experience" onClick={() => setAdding("experience")} />}
                {(cv.educations.length > 0 || adding === "education") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3 pb-1 border-b-2" style={{ color: accent, borderColor: accent }}>Education</h2>
                        <div className="space-y-3 mt-3">
                            {cv.educations.map((edu) =>
                                editing?.section === "education" && editing.id === edu.id ? (
                                    <EducationForm key={edu.id} cvId={cv.id} edu={edu} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={edu.id} className="relative group grid grid-cols-[1fr_auto] gap-2">
                                        <div>
                                            <p className="font-bold text-slate-900">{edu.degree} in {edu.field_of_study}</p>
                                            <p className="text-slate-500 text-[10px]">{edu.institution_name}{edu.location ? ` · ${edu.location}` : ""}</p>
                                        </div>
                                        <p className="text-slate-400 text-[10px] whitespace-nowrap text-right">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p>
                                        <EntryControls onEdit={() => setEditing({ section: "education", id: edu.id })} onDelete={() => router.delete(`/cv/${cv.id}/education/${edu.id}`, { preserveScroll: true })} />
                                    </div>
                                )
                            )}
                            {adding === "education" && <EducationForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add education" onClick={() => setAdding("education")} />
                    </div>
                )}
                {cv.educations.length === 0 && adding !== "education" && <AddEntryBtn label="+ Add education" onClick={() => setAdding("education")} />}
                {(cv.skills.length > 0 || adding === "skills") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3 pb-1 border-b-2" style={{ color: accent, borderColor: accent }}>Skills</h2>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {cv.skills.map((skill) =>
                                editing?.section === "skills" && editing.id === skill.id ? (
                                    <SkillForm key={skill.id} cvId={cv.id} skill={skill} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={skill.id} className="relative group flex items-center gap-1.5 px-3 py-1 border border-slate-200 rounded-md">
                                        <span className="text-[10px] font-medium text-slate-700">{skill.skill_name}</span>
                                        <div className="no-print flex gap-0.5 opacity-0 group-hover:opacity-100">
                                            <button onClick={() => setEditing({ section: "skills", id: skill.id })} className="text-slate-300 hover:text-blue-500"><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z" /></svg></button>
                                            <button onClick={() => router.delete(`/cv/${cv.id}/skills/${skill.id}`, { preserveScroll: true })} className="text-slate-300 hover:text-red-500"><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" /></svg></button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                        {adding === "skills" && <SkillForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        <AddEntryBtn label="Add skill" onClick={() => setAdding("skills")} />
                    </div>
                )}
                {cv.skills.length === 0 && adding !== "skills" && <AddEntryBtn label="+ Add skills" onClick={() => setAdding("skills")} />}
                {(cv.projects.length > 0 || adding === "projects") && (
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3 pb-1 border-b-2" style={{ color: accent, borderColor: accent }}>Projects</h2>
                        <div className="space-y-3 mt-3">
                            {cv.projects.map((proj) =>
                                editing?.section === "projects" && editing.id === proj.id ? (
                                    <ProjectForm key={proj.id} cvId={cv.id} proj={proj} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={proj.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "projects", id: proj.id })} onDelete={() => router.delete(`/cv/${cv.id}/projects/${proj.id}`, { preserveScroll: true })} />
                                        <p className="font-bold text-slate-900">{proj.project_name}</p>
                                        {proj.tech_stack && <p className="text-slate-400 text-[10px]">{proj.tech_stack}</p>}
                                        {proj.description && <p className="text-slate-600 text-[10px] mt-0.5">{proj.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "projects" && <ProjectForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add project" onClick={() => setAdding("projects")} />
                    </div>
                )}
                {cv.projects.length === 0 && adding !== "projects" && <AddEntryBtn label="+ Add projects" onClick={() => setAdding("projects")} />}
            </div>
        </div>
    );
}

// ─── Template: Creative (photo upload) ───────────────────────────────────────

function CreativeTemplate({ cv, photoSrc, onField, editing, setEditing, adding, setAdding, onPhotoUpload }: TemplateProps) {
    const accent = cv.accent_color || "#db2777";
    const fileRef = useRef<HTMLInputElement>(null);

    return (
        <div className="bg-white flex text-[11px] leading-relaxed" style={{ minHeight: "1123px" }}>
            {/* Sidebar */}
            <div
                className="w-[210px] shrink-0 flex flex-col px-5 py-8 gap-5"
                style={{ backgroundColor: accent }}
            >
                {/* Photo — img stays visible for PDF capture; upload UI is no-print only */}
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-24 h-24 rounded-full border-4 overflow-hidden relative"
                        style={{ borderColor: "rgba(255,255,255,0.4)" }}
                    >
                        {photoSrc ? (
                            <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div
                                className="no-print w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer"
                                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                                onClick={() => fileRef.current?.click()}
                                title="Click to upload photo"
                            >
                                <svg className="w-8 h-8" style={{ color: "rgba(255,255,255,0.6)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                </svg>
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}>Upload photo</span>
                            </div>
                        )}
                        {photoSrc && (
                            <div
                                className="no-print absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer"
                                style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
                                onClick={() => fileRef.current?.click()}
                                title="Click to change photo"
                            >
                                <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && onPhotoUpload(e.target.files[0])} />
                </div>

                <EditableText tag="h1" value={cv.full_name || ""} onSave={(v) => onField("full_name", v)}
                    placeholder="Your Name" className="text-lg font-bold text-white text-center block leading-tight" />

                <div className="border-t border-white/20 pt-4 space-y-2">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Contact</p>
                    {["email", "phone", "location", "website", "linkedin", "github"].map((f) => (
                        <EditableText key={f} value={(cv as any)[f] || ""} onSave={(v) => onField(f, v)} placeholder={f} className="text-white/75 text-[10px] break-all block" />
                    ))}
                </div>

                {(cv.skills.length > 0 || adding === "skills") && (
                    <div className="border-t border-white/20 pt-4">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-3">Skills</p>
                        <div className="space-y-2">
                            {cv.skills.map((skill) =>
                                editing?.section === "skills" && editing.id === skill.id ? (
                                    <SkillForm key={skill.id} cvId={cv.id} skill={skill} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={skill.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "skills", id: skill.id })} onDelete={() => router.delete(`/cv/${cv.id}/skills/${skill.id}`, { preserveScroll: true })} />
                                        <p className="text-white/80 text-[10px]">{skill.skill_name}</p>
                                        <div className="h-1 rounded-full bg-white/15 mt-0.5"><div className="h-1 rounded-full bg-white/70" style={{ width: `${PROFICIENCY_WIDTH[skill.proficiency_level]}%` }} /></div>
                                    </div>
                                )
                            )}
                            {adding === "skills" && <SkillForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add skill" onClick={() => setAdding("skills")} />
                    </div>
                )}
                {cv.skills.length === 0 && adding !== "skills" && <AddEntryBtn label="+ Skills" onClick={() => setAdding("skills")} />}
            </div>

            {/* Main content */}
            <div className="flex-1 px-8 py-8 space-y-6">
                <div>
                    <h2 className="font-bold uppercase tracking-[0.12em] text-[10px] pb-1 border-b-2 mb-2" style={{ color: accent, borderColor: accent }}>About</h2>
                    <EditableArea value={cv.summary || ""} onSave={(v) => onField("summary", v)} placeholder="Add a professional summary…" rows={2} className="text-slate-600" />
                </div>
                {(cv.experiences.length > 0 || adding === "experience") && (
                    <div>
                        <h2 className="font-bold uppercase tracking-[0.12em] text-[10px] pb-1 border-b-2 mb-3" style={{ color: accent, borderColor: accent }}>Experience</h2>
                        <div className="space-y-4">
                            {cv.experiences.map((exp) =>
                                editing?.section === "experience" && editing.id === exp.id ? (
                                    <ExperienceForm key={exp.id} cvId={cv.id} exp={exp} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={exp.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "experience", id: exp.id })} onDelete={() => router.delete(`/cv/${cv.id}/experiences/${exp.id}`, { preserveScroll: true })} />
                                        <div className="flex justify-between items-baseline"><p className="font-bold text-slate-800">{exp.job_title}</p><p className="text-slate-400 text-[10px]">{fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}</p></div>
                                        <p className="text-[10px]" style={{ color: accent }}>{exp.company_name}{exp.location ? ` · ${exp.location}` : ""}</p>
                                        {exp.description && <p className="text-slate-600 text-[10px] mt-1">{exp.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "experience" && <ExperienceForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add experience" onClick={() => setAdding("experience")} />
                    </div>
                )}
                {cv.experiences.length === 0 && adding !== "experience" && <AddEntryBtn label="+ Add experience" onClick={() => setAdding("experience")} />}
                {(cv.educations.length > 0 || adding === "education") && (
                    <div>
                        <h2 className="font-bold uppercase tracking-[0.12em] text-[10px] pb-1 border-b-2 mb-3" style={{ color: accent, borderColor: accent }}>Education</h2>
                        <div className="space-y-3">
                            {cv.educations.map((edu) =>
                                editing?.section === "education" && editing.id === edu.id ? (
                                    <EducationForm key={edu.id} cvId={cv.id} edu={edu} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={edu.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "education", id: edu.id })} onDelete={() => router.delete(`/cv/${cv.id}/education/${edu.id}`, { preserveScroll: true })} />
                                        <div className="flex justify-between"><p className="font-bold text-slate-800">{edu.degree} in {edu.field_of_study}</p><p className="text-slate-400 text-[10px]">{fmtDate(edu.start_date)} – {edu.is_current ? "Present" : fmtDate(edu.end_date)}</p></div>
                                        <p className="text-[10px]" style={{ color: accent }}>{edu.institution_name}</p>
                                    </div>
                                )
                            )}
                            {adding === "education" && <EducationForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add education" onClick={() => setAdding("education")} />
                    </div>
                )}
                {cv.educations.length === 0 && adding !== "education" && <AddEntryBtn label="+ Add education" onClick={() => setAdding("education")} />}
                {(cv.projects.length > 0 || adding === "projects") && (
                    <div>
                        <h2 className="font-bold uppercase tracking-[0.12em] text-[10px] pb-1 border-b-2 mb-3" style={{ color: accent, borderColor: accent }}>Projects</h2>
                        <div className="space-y-3">
                            {cv.projects.map((proj) =>
                                editing?.section === "projects" && editing.id === proj.id ? (
                                    <ProjectForm key={proj.id} cvId={cv.id} proj={proj} onDone={() => setEditing(null)} />
                                ) : (
                                    <div key={proj.id} className="relative group">
                                        <EntryControls onEdit={() => setEditing({ section: "projects", id: proj.id })} onDelete={() => router.delete(`/cv/${cv.id}/projects/${proj.id}`, { preserveScroll: true })} />
                                        <p className="font-bold text-slate-800">{proj.project_name}</p>
                                        {proj.tech_stack && <p className="text-[10px]" style={{ color: accent }}>{proj.tech_stack}</p>}
                                        {proj.description && <p className="text-slate-600 text-[10px] mt-0.5">{proj.description}</p>}
                                    </div>
                                )
                            )}
                            {adding === "projects" && <ProjectForm cvId={cv.id} onDone={() => setAdding(null)} />}
                        </div>
                        <AddEntryBtn label="Add project" onClick={() => setAdding("projects")} />
                    </div>
                )}
                {cv.projects.length === 0 && adding !== "projects" && <AddEntryBtn label="+ Add projects" onClick={() => setAdding("projects")} />}
            </div>
        </div>
    );
}

// ─── Main Show Page ───────────────────────────────────────────────────────────

export default function Show({ cv }: { cv: Cv }) {
    const [editing, setEditing] = useState<{ section: string; id: number } | null>(null);
    const [adding, setAdding] = useState<SectionKey | null>(null);
    const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const cvRef = useRef<HTMLDivElement>(null);
    const titleForm = useForm({ title: cv.title });

    // The photo to display: local preview takes priority while upload is in progress
    const photoSrc = localPhotoUrl ?? cv.photo_url;

    function saveField(field: string, value: string) {
        router.put(`/cv/${cv.id}`, { [field]: value }, { preserveScroll: true });
    }

    function uploadPhoto(file: File) {
        // Show immediate local preview
        const url = URL.createObjectURL(file);
        setLocalPhotoUrl(url);

        const form = new FormData();
        form.append("photo", file);
        router.post(`/cv/${cv.id}/photo`, form as any, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                // Server photo_url is now fresh; drop the local blob URL
                URL.revokeObjectURL(url);
                setLocalPhotoUrl(null);
            },
        });
    }

    async function downloadPdf() {
        if (!cvRef.current || downloading) return;
        setDownloading(true);

        // ── Modern color → rgb converter (browser canvas as resolver) ──────
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = tmpCanvas.height = 1;
        const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true })!;
        function toRgb(colorStr: string): string {
            try {
                tmpCtx.clearRect(0, 0, 1, 1);
                tmpCtx.fillStyle = colorStr;
                tmpCtx.fillRect(0, 0, 1, 1);
                const [r, g, b, a] = tmpCtx.getImageData(0, 0, 1, 1).data;
                return a < 255 ? `rgba(${r},${g},${b},${+(a / 255).toFixed(3)})` : `rgb(${r},${g},${b})`;
            } catch {
                return "#000";
            }
        }
        const HAS_MODERN_COLOR = (s: string) =>
            /oklch|oklab|color-mix|color\(|lab\(|lch\(|display-p3|\bin\s+(?:oklab|oklch)/i.test(s);

        function replaceParenCalls(css: string, fnName: string): string {
            const re = new RegExp(`${fnName}\\(`, "gi");
            let result = css;
            for (let safety = 0; safety < 500; safety++) {
                const match = re.exec(result);
                if (!match) break;
                const start = match.index;
                let depth = 0;
                let end = start;
                for (let i = start; i < result.length; i++) {
                    if (result[i] === "(") depth++;
                    else if (result[i] === ")") {
                        depth--;
                        if (depth === 0) {
                            end = i + 1;
                            break;
                        }
                    }
                }
                const full = result.slice(start, end);
                result = result.slice(0, start) + toRgb(full) + result.slice(end);
                re.lastIndex = 0;
            }
            return result;
        }

        const fixModernColors = (css: string) => {
            let result = css;
            for (const fn of ["color-mix", "oklch", "oklab", "color", "lab", "lch", "display-p3"]) {
                result = replaceParenCalls(result, fn);
            }
            return result.replace(
                /\s+in\s+(?:oklab|oklch|srgb-linear|display-p3|hsl|hwb)/gi,
                "",
            );
        };

        // ── Pre-fetch stylesheets and fix all modern color fns ──────────────
        const cssCache = new Map<string, string>();
        for (const link of Array.from(
            document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
        )) {
            try {
                const res = await fetch(link.href, { credentials: "same-origin" });
                const text = await res.text();
                cssCache.set(link.href, HAS_MODERN_COLOR(text) ? fixModernColors(text) : text);
            } catch { /* cross-origin / network error — leave as-is */ }
        }

        // ── Inline images as data URLs so html2canvas can embed them ─────────
        const imageDataUrls = new Map<string, string>();
        for (const img of Array.from(cvRef.current.querySelectorAll<HTMLImageElement>("img"))) {
            if (!img.src || img.src.startsWith("data:")) continue;
            try {
                const res = await fetch(img.src, { credentials: "same-origin" });
                if (!res.ok) continue;
                const blob = await res.blob();
                imageDataUrls.set(
                    img.src,
                    await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    }),
                );
            } catch { /* broken / cross-origin image — leave as-is */ }
        }

        const COLOR_PROPS = [
            "color", "backgroundColor",
            "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
            "outlineColor", "textDecorationColor", "columnRuleColor",
            "fill", "stroke",
        ] as const;

        // ── Hide edit-only controls ───────────────────────────────────────────
        const noprints = cvRef.current.querySelectorAll<HTMLElement>(".no-print");
        noprints.forEach((el) => (el.style.display = "none"));

        let capturedCanvas: HTMLCanvasElement | null = null;
        try {
            capturedCanvas = await html2canvas(cvRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    // 1) Fix raw text in <style> blocks (Vite injects CSS this way in dev)
                    clonedDoc.querySelectorAll("style").forEach((s) => {
                        if (s.textContent && HAS_MODERN_COLOR(s.textContent)) {
                            s.textContent = fixModernColors(s.textContent);
                        }
                    });

                    // 2) Swap <link> sheets with pre-converted inline <style> blocks
                    clonedDoc
                        .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
                        .forEach((link) => {
                            const css = cssCache.get(link.href);
                            if (css !== undefined) {
                                const style = clonedDoc.createElement("style");
                                style.textContent = css;
                                link.parentNode?.replaceChild(style, link);
                            }
                        });

                    // 3) Inline resolved rgb colours so html2canvas never parses oklab rules
                    const view = clonedDoc.defaultView ?? window;
                    function patchEl(el: HTMLElement) {
                        const attr = el.getAttribute("style") ?? "";
                        if (HAS_MODERN_COLOR(attr)) {
                            el.setAttribute("style", fixModernColors(attr));
                        }

                        try {
                            const c = view.getComputedStyle(el);
                            for (const prop of COLOR_PROPS) {
                                const val = c[prop];
                                if (val && val !== "transparent" && val !== "rgba(0, 0, 0, 0)") {
                                    el.style[prop] = val;
                                }
                            }
                            const bgImg = c.backgroundImage;
                            if (bgImg && bgImg !== "none" && HAS_MODERN_COLOR(bgImg)) {
                                el.style.backgroundImage = "none";
                                const bgColor = c.backgroundColor;
                                if (!bgColor || bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent") {
                                    el.style.backgroundColor = "#ffffff";
                                }
                            }
                        } catch { /* getComputedStyle may fail on pseudo-elements */ }

                        for (const child of el.children) {
                            patchEl(child as HTMLElement);
                        }
                    }
                    patchEl(clonedDoc.documentElement);

                    // 4) Embed fetched images as data URLs
                    clonedDoc.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
                        const dataUrl = imageDataUrls.get(img.src);
                        if (dataUrl) img.src = dataUrl;
                    });
                },
            });
        } finally {
            // Always restore edit controls, even if html2canvas throws
            noprints.forEach((el) => (el.style.display = ""));
        }

        if (!capturedCanvas) { setDownloading(false); return; }

        // ── Build PDF (handles multi-page CVs) ────────────────────────────────
        const imgData = capturedCanvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
        const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm
        const imgH = (capturedCanvas.height / capturedCanvas.width) * pdfW;

        if (imgH <= pdfH) {
            pdf.addImage(imgData, "JPEG", 0, 0, pdfW, imgH);
        } else {
            const pagePixels = (capturedCanvas.width / pdfW) * pdfH;
            let yOffset = 0;
            while (yOffset < capturedCanvas.height) {
                const sliceH = Math.min(pagePixels, capturedCanvas.height - yOffset);
                const slice = document.createElement("canvas");
                slice.width = capturedCanvas.width;
                slice.height = sliceH;
                slice.getContext("2d")!.drawImage(capturedCanvas, 0, -yOffset);
                if (yOffset > 0) pdf.addPage();
                pdf.addImage(
                    slice.toDataURL("image/jpeg", 0.95),
                    "JPEG", 0, 0,
                    pdfW,
                    (sliceH / capturedCanvas.width) * pdfW
                );
                yOffset += pagePixels;
            }
        }

        pdf.save(`${cv.title || "resume"}.pdf`);
        setDownloading(false);
    }

    const tplProps: TemplateProps = {
        cv, photoSrc, onField: saveField,
        editing, setEditing,
        adding, setAdding,
        onPhotoUpload: uploadPhoto,
    };

    const templateMap: Record<string, React.ReactNode> = {
        classic:   <ClassicTemplate   {...tplProps} />,
        modern:    <ModernTemplate    {...tplProps} />,
        minimal:   <MinimalTemplate   {...tplProps} />,
        executive: <ExecutiveTemplate {...tplProps} />,
        creative:  <CreativeTemplate  {...tplProps} />,
    };

    const currentTemplate = cv.template || "classic";
    const templateLabel = currentTemplate.charAt(0).toUpperCase() + currentTemplate.slice(1);

    return (
        <AppLayout>
            <Head title={cv.title} />

            <div className="flex flex-col h-full">
                {/* ── Toolbar ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-4">
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                        <a href="/cv" className="shrink-0 flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd" />
                            </svg>
                            My CVs
                        </a>
                        <span className="text-slate-200">/</span>
                        <input
                            className="min-w-0 text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none px-1 py-0.5 transition-colors"
                            value={titleForm.data.title}
                            onChange={(e) => titleForm.setData("title", e.target.value)}
                            onBlur={() => titleForm.put(`/cv/${cv.id}`, { preserveScroll: true })}
                        />
                    </div>

                    {/* Center: template badge (read-only) */}
                    <span className="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {templateLabel} template
                    </span>

                    {/* Right: AI summary + download */}
                    <div className="shrink-0 flex items-center gap-2">
                    <button
                        onClick={() => setAiOpen(true)}
                        className="flex items-center gap-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-[12px] font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                        title="AI suggestions for your resume"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        AI Coach
                    </button>
                    <button
                        onClick={downloadPdf}
                        disabled={downloading}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                        {downloading ? (
                            <>
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Generating…
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2.75 14A1.75 1.75 0 011 12.25v-2.5a.75.75 0 011.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0113.25 14H2.75z" />
                                    <path d="M7.25 7.689V2a.75.75 0 011.5 0v5.689l1.97-1.97a.749.749 0 111.06 1.06l-3.25 3.25a.749.749 0 01-1.06 0L4.22 6.779a.749.749 0 111.06-1.06l1.97 1.97z" />
                                </svg>
                                Download PDF
                            </>
                        )}
                    </button>
                    </div>
                </div>

                {/* ── Canvas ──────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-slate-300 flex justify-center py-10 px-4">
                    <div ref={cvRef} className="bg-white shadow-2xl rounded-lg overflow-hidden" style={{ width: "794px" }}>
                        {templateMap[currentTemplate] ?? templateMap["classic"]}
                    </div>
                </div>
            </div>

            {/* AI Coach drawer */}
            <AiCvSummaryDrawer
                cvId={cv.id}
                open={aiOpen}
                contentVersion={cv.updated_at}
                onClose={() => setAiOpen(false)}
                onApplied={() => {
                    router.reload({ only: ["cv"] });
                }}
            />
        </AppLayout>
    );
}
