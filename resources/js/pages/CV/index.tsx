import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cv {
    id: number;
    title: string;
    is_default: boolean;
    template: string;
    accent_color: string;
    full_name: string | null;
    source?: string;
    original_filename?: string | null;
    experiences_count: number;
    educations_count: number;
    skills_count: number;
    projects_count: number;
    updated_at: string;
    created_at: string;
}

interface Props {
    cvs: Cv[];
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
    {
        key: "classic",
        label: "Classic",
        description: "Timeless single-column with accent header line",
        accent: "#2563eb",
    },
    { 
        key: "modern",
        label: "Modern",
        description: "Two-column sidebar for a contemporary feel",
        accent: "#7c3aed",
    },
    {
        key: "minimal",
        label: "Minimal",
        description: "Clean and spacious — let content breathe",
        accent: "#0f766e",
    },
    {
        key: "executive",
        label: "Executive",
        description: "Bold dark header for senior professionals",
        accent: "#1e293b",
    },
    {
        key: "creative",
        label: "Creative",
        description: "Gradient sidebar with photo upload",
        accent: "#db2777",
    },
] as const;

type TemplateKey = typeof TEMPLATES[number]["key"];

// ─── Mini template thumbnails ─────────────────────────────────────────────────

function ClassicThumb({ accent }: { accent: string }) {
    return (
        <div className="w-full h-full bg-white p-2 flex flex-col gap-1.5">
            <div className="h-[2px] w-full rounded" style={{ backgroundColor: accent }} />
            <div className="h-3 w-3/4 rounded bg-slate-300" />
            <div className="h-1.5 w-1/2 rounded bg-slate-200" />
            <div className="mt-2 space-y-1">
                <div className="h-1 w-1/3 rounded" style={{ backgroundColor: accent + "99" }} />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-5/6 rounded bg-slate-100" />
                <div className="h-1 w-full rounded bg-slate-100" />
            </div>
            <div className="space-y-1">
                <div className="h-1 w-1/3 rounded" style={{ backgroundColor: accent + "99" }} />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-4/6 rounded bg-slate-100" />
            </div>
        </div>
    );
}

function ModernThumb({ accent }: { accent: string }) {
    return (
        <div className="w-full h-full flex">
            <div className="w-2/5 h-full p-1.5 flex flex-col gap-1.5" style={{ backgroundColor: accent }}>
                <div className="w-8 h-8 rounded-full bg-white/30 mx-auto mt-1" />
                <div className="h-1.5 w-3/4 rounded bg-white/40 mx-auto" />
                <div className="h-px w-full rounded bg-white/20 my-0.5" />
                <div className="h-1 w-5/6 rounded bg-white/30" />
                <div className="h-1 w-4/6 rounded bg-white/30" />
                <div className="h-1 w-5/6 rounded bg-white/30" />
            </div>
            <div className="flex-1 p-1.5 space-y-1.5">
                <div className="h-2 w-full rounded bg-slate-200" />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-5/6 rounded bg-slate-100" />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-4/6 rounded bg-slate-100" />
                <div className="h-1 w-full rounded bg-slate-100" />
            </div>
        </div>
    );
}

function MinimalThumb({ accent }: { accent: string }) {
    return (
        <div className="w-full h-full bg-white p-3 flex flex-col gap-2.5">
            <div>
                <div className="h-3 w-2/3 rounded bg-slate-700" />
                <div className="h-px w-full rounded bg-slate-200 mt-2" />
                <div className="h-1 w-1/2 rounded bg-slate-200 mt-1" />
            </div>
            <div className="space-y-1">
                <div className="h-1 w-1/4 rounded" style={{ backgroundColor: accent }} />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-5/6 rounded bg-slate-100" />
            </div>
            <div className="space-y-1">
                <div className="h-1 w-1/4 rounded" style={{ backgroundColor: accent }} />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-3/4 rounded bg-slate-100" />
            </div>
        </div>
    );
}

function ExecutiveThumb({ accent }: { accent: string }) {
    return (
        <div className="w-full h-full bg-white flex flex-col">
            <div className="p-2.5" style={{ backgroundColor: accent }}>
                <div className="h-3 w-3/4 rounded bg-white/70" />
                <div className="h-1.5 w-1/2 rounded bg-white/40 mt-1.5" />
                <div className="flex gap-1.5 mt-1.5">
                    <div className="h-1 w-1/4 rounded bg-white/30" />
                    <div className="h-1 w-1/4 rounded bg-white/30" />
                </div>
            </div>
            <div className="p-1.5 space-y-1.5 flex-1">
                <div className="h-px w-full rounded bg-slate-300" />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-5/6 rounded bg-slate-100" />
                <div className="h-px w-full rounded bg-slate-200" />
                <div className="h-1 w-full rounded bg-slate-100" />
            </div>
        </div>
    );
}

function CreativeThumb({ accent }: { accent: string }) {
    return (
        <div className="w-full h-full flex">
            <div
                className="w-2/5 h-full p-1.5 flex flex-col items-center gap-1.5"
                style={{ background: `linear-gradient(160deg, ${accent}, ${accent}bb)` }}
            >
                <div className="w-8 h-8 rounded-full bg-white/40 border-2 border-white/60 mt-1" />
                <div className="h-1.5 w-3/4 rounded bg-white/50" />
                <div className="h-px w-full rounded bg-white/20 my-0.5" />
                <div className="h-1 w-5/6 rounded bg-white/30" />
                <div className="h-1 w-4/6 rounded bg-white/30" />
            </div>
            <div className="flex-1 bg-white p-1.5 space-y-1.5">
                <div className="h-2 w-4/5 rounded bg-slate-200" />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-5/6 rounded bg-slate-100" />
                <div className="h-1 w-full rounded bg-slate-100" />
                <div className="h-1 w-3/4 rounded bg-slate-100" />
            </div>
        </div>
    );
}

const THUMB_MAP: Record<TemplateKey, React.ComponentType<{ accent: string }>> = {
    classic:   ClassicThumb,
    modern:    ModernThumb,
    minimal:   MinimalThumb,
    executive: ExecutiveThumb,
    creative:  CreativeThumb,
};

// ─── Existing CV thumbnail ────────────────────────────────────────────────────

function UploadThumb() {
    return (
        <div className="w-full h-full bg-amber-50 flex flex-col items-center justify-center gap-2 p-3">
            <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">PDF / DOCX</span>
        </div>
    );
}

function CvThumbnail({ cv }: { cv: Cv }) {
    if (cv.source === 'upload') {
        return <UploadThumb />;
    }
    const tpl = (cv.template || "classic") as TemplateKey;
    const tmpl = TEMPLATES.find((t) => t.key === tpl) ?? TEMPLATES[0];
    const accent = cv.accent_color || tmpl.accent;
    const Thumb = THUMB_MAP[tpl] ?? ClassicThumb;
    return (
        <div className="w-full h-full rounded-lg overflow-hidden">
            <Thumb accent={accent} />
        </div>
    );
}

// ─── Main Index Page ───────────────────────────────────────────────────────────

export default function Index({ cvs }: Props) {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
    const [cvName, setCvName] = useState("");
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    function pickTemplate(key: TemplateKey) {
        setSelectedTemplate(key);
        setCvName("");
        setTimeout(() => nameInputRef.current?.focus(), 60);
    }

    function createCv() {
        if (!selectedTemplate || !cvName.trim() || creating) return;
        setCreating(true);
        router.post("/cv", { title: cvName.trim(), template: selectedTemplate }, {
            onFinish: () => setCreating(false),
        });
    }

    function deleteCv(id: number) {
        if (confirm("Delete this CV? This cannot be undone.")) {
            router.delete(`/cv/${id}`);
        }
        setMenuOpen(null);
    }

    function uploadCv(file: File) {
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (!extension || !["pdf", "docx"].includes(extension)) {
            setUploadError("Please upload a PDF or DOCX file.");
            return;
        }

        setUploadError(null);
        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        router.post("/cv/upload", formData, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errors) => {
                setUploadError(
                    (errors.file as string) ||
                        (errors.upload as string) ||
                        "The CV could not be uploaded. Please try again.",
                );
            },
            onFinish: () => setUploading(false),
        });
    }

    const selectedMeta = TEMPLATES.find((t) => t.key === selectedTemplate);

    return (
        <AppLayout>
            <Head title="My CVs" />

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

                {/* ── Upload CV section ─────────────────────────────────── */}
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Upload a CV</h2>
                            <p className="text-slate-500 text-sm mt-0.5">PDF or DOCX — use alongside your built CVs when applying</p>
                        </div>
                        <div>
                            <input
                                ref={uploadInputRef}
                                type="file"
                                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadCv(file);
                                    e.target.value = "";
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => uploadInputRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                            >
                                {uploading ? "Uploading…" : "Choose file to upload"}
                            </button>
                        </div>
                    </div>
                    {uploadError && (
                        <p className="mt-3 text-sm text-red-600">{uploadError}</p>
                    )}
                </div>

                {/* ── Create New CV section ─────────────────────────────── */}
                <div>
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create a new CV</h2>
                        <p className="text-slate-400 text-sm mt-0.5">Choose a template to get started</p>
                    </div>

                    {/* Template grid */}
                    <div className="grid grid-cols-5 gap-4">
                        {TEMPLATES.map((tmpl) => {
                            const Thumb = THUMB_MAP[tmpl.key];
                            const selected = selectedTemplate === tmpl.key;
                            return (
                                <button
                                    key={tmpl.key}
                                    onClick={() => pickTemplate(tmpl.key)}
                                    className={`group flex flex-col gap-2 text-left rounded-2xl p-2 border-2 transition-all focus:outline-none ${
                                        selected
                                            ? "border-blue-500 shadow-lg shadow-blue-100 scale-[1.02]"
                                            : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                    }`}
                                >
                                    <div className="aspect-[3/4] rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                                        <Thumb accent={tmpl.accent} />
                                    </div>
                                    <div className="px-0.5 pb-0.5">
                                        <p className={`text-[13px] font-bold ${selected ? "text-blue-600" : "text-slate-700"}`}>
                                            {tmpl.label}
                                        </p>
                                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{tmpl.description}</p>
                                        {tmpl.key === "creative" && (
                                            <span className="inline-block mt-1 text-[10px] bg-pink-50 text-pink-500 font-semibold rounded-full px-2 py-0.5">
                                                Supports photo
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Name input — appears after picking a template */}
                    {selectedTemplate && (
                        <div className="mt-5 flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            {/* Small template preview */}
                            <div className="w-10 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                {(() => { const T = THUMB_MAP[selectedTemplate]; return <T accent={selectedMeta!.accent} />; })()}
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] text-slate-400 font-medium mb-1">
                                    {selectedMeta?.label} template — give your CV a name
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        placeholder="e.g. Software Engineer Resume"
                                        value={cvName}
                                        onChange={(e) => setCvName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && createCv()}
                                        className="flex-1 px-3 py-2 text-sm text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300 bg-white"
                                    />
                                    <button
                                        onClick={createCv}
                                        disabled={creating || !cvName.trim()}
                                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                                    >
                                        {creating ? "Creating…" : "Create CV →"}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="shrink-0 w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Existing CVs ──────────────────────────────────────── */}
                {cvs.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">My CVs</h2>
                                <p className="text-slate-400 text-sm mt-0.5">
                                    {cvs.length} document{cvs.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {cvs.map((cv) => (
                                <div
                                    key={cv.id}
                                    className="relative"
                                    onMouseEnter={() => setHoveredId(cv.id)}
                                    onMouseLeave={() => { setHoveredId(null); setMenuOpen(null); }}
                                >
                                    <div className="relative aspect-[3/4]">
                                        {cv.source === 'upload' ? (
                                            <a
                                                href={`/cv/${cv.id}/download`}
                                                className="block w-full h-full rounded-xl overflow-hidden border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all duration-200 bg-slate-50"
                                            >
                                                <CvThumbnail cv={cv} />
                                            </a>
                                        ) : (
                                            <Link
                                                href={`/cv/${cv.id}`}
                                                className="block w-full h-full rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 bg-slate-50"
                                            >
                                                <CvThumbnail cv={cv} />
                                            </Link>
                                        )}

                                        {/* Template / upload badge */}
                                        <div className="absolute bottom-2 left-2">
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-white backdrop-blur-sm">
                                                {cv.source === 'upload' ? 'upload' : (cv.template || "classic")}
                                            </span>
                                        </div>

                                        {/* 3-dot menu */}
                                        <div
                                            className={`absolute top-2 right-2 transition-opacity duration-150 ${hoveredId === cv.id || menuOpen === cv.id ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setMenuOpen(menuOpen === cv.id ? null : cv.id);
                                                }}
                                                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 16 16" fill="currentColor">
                                                    <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                                </svg>
                                            </button>

                                            {menuOpen === cv.id && (
                                                <div className="absolute right-0 top-9 bg-white border border-slate-200 rounded-xl shadow-xl w-40 py-1 z-20">
                                                    <Link
                                                        href={`/cv/${cv.id}`}
                                                        className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                                                        onClick={() => setMenuOpen(null)}
                                                    >
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z" />
                                                        </svg>
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => deleteCv(cv.id)}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M6.5 7v5M9.5 7v5M3.5 4l.5 9.5h8L13 4" />
                                                        </svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2 px-0.5">
                                        <Link href={`/cv/${cv.id}`} className="block">
                                            <p className="text-[13px] font-medium text-slate-800 truncate hover:text-blue-600 transition-colors">
                                                {cv.title}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(cv.updated_at)}</p>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
