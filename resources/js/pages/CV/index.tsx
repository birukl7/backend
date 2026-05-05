import AppLayout from "@/layouts/app-layout";
import { Head, Link, useForm, router } from "@inertiajs/react";
import { useState } from "react";

interface Cv {
    id: number;
    title: string;
    is_default: boolean;
    template: string;
    accent_color: string;
    full_name: string | null;
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

const TEMPLATE_COLORS: Record<string, string> = {
    classic: "#2563eb",
    modern: "#7c3aed",
    minimal: "#0f766e",
};

function CvThumbnail({ cv }: { cv: Cv }) {
    const accent = cv.accent_color || TEMPLATE_COLORS[cv.template] || "#2563eb";
    return (
        <div className="w-full h-full bg-white rounded-lg overflow-hidden" style={{ fontFamily: "Georgia, serif" }}>
            {/* Header strip */}
            <div className="h-8 w-full" style={{ backgroundColor: accent }} />
            {/* Content lines */}
            <div className="p-3 space-y-1.5">
                <div className="h-2.5 rounded w-3/4 bg-slate-200" />
                <div className="h-1.5 rounded w-1/2 bg-slate-100" />
                <div className="mt-3 h-1 rounded w-full bg-slate-100" />
                <div className="h-1 rounded w-5/6 bg-slate-100" />
                <div className="h-1 rounded w-full bg-slate-100" />
                <div className="mt-2 h-1 rounded w-2/3 bg-slate-100" />
                <div className="h-1 rounded w-full bg-slate-100" />
                <div className="h-1 rounded w-4/5 bg-slate-100" />
                <div className="mt-2 h-1 rounded w-3/5 bg-slate-100" />
                <div className="h-1 rounded w-full bg-slate-100" />
            </div>
        </div>
    );
}

function NewCvModal({ onClose }: { onClose: () => void }) {
    const { data, setData, post, processing, errors } = useForm({ title: "" });

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
                <h2 className="text-lg font-bold text-slate-900 mb-1">New CV</h2>
                <p className="text-slate-400 text-sm mb-5">Give your CV a name to get started</p>
                <input
                    type="text"
                    placeholder="e.g. Software Engineer Resume"
                    value={data.title}
                    onChange={(e) => setData("title", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && post("/cv")}
                    autoFocus
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-slate-300"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => post("/cv")}
                        disabled={processing || !data.title.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {processing ? "Creating…" : "Create CV"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Index({ cvs }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [menuOpen, setMenuOpen] = useState<number | null>(null);

    function deleteCv(id: number) {
        if (confirm("Delete this CV? This cannot be undone.")) {
            router.delete(`/cv/${id}`);
        }
        setMenuOpen(null);
    }

    return (
        <AppLayout>
            <Head title="My CVs" />

            <style>{`
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in { animation: scale-in 0.18s cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My CVs</h1>
                        <p className="text-slate-400 text-sm mt-0.5">{cvs.length} document{cvs.length !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                        </svg>
                        New CV
                    </button>
                </div>

                {/* Empty state */}
                {cvs.length === 0 && (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                            </svg>
                        </div>
                        <h3 className="text-slate-700 font-semibold text-lg">No CVs yet</h3>
                        <p className="text-slate-400 text-sm mt-1 mb-6">Create your first CV to get started</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                            </svg>
                            Create your first CV
                        </button>
                    </div>
                )}

                {/* CV Grid */}
                {cvs.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {/* New CV card */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="group aspect-[3/4] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl transition-all hover:bg-blue-50/50 cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
                                </svg>
                            </div>
                            <span className="text-[12px] text-slate-400 group-hover:text-blue-500 font-medium transition-colors">New CV</span>
                        </button>

                        {cvs.map((cv) => (
                            <div key={cv.id} className="group relative">
                                {/* Thumbnail card */}
                                <Link
                                    href={`/cv/${cv.id}`}
                                    className="block aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 bg-slate-50"
                                >
                                    <CvThumbnail cv={cv} />
                                </Link>

                                {/* 3-dot menu */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === cv.id ? null : cv.id); }}
                                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM1.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                                        </svg>
                                    </button>
                                    {menuOpen === cv.id && (
                                        <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl w-40 py-1 z-10">
                                            <Link
                                                href={`/cv/${cv.id}`}
                                                className="flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                                                onClick={() => setMenuOpen(null)}
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path strokeLinecap="round" d="M11.5 2.5l2 2-8 8-2.5.5.5-2.5 8-8z"/>
                                                </svg>
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => deleteCv(cv.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M6.5 7v5M9.5 7v5M3.5 4l.5 9.5h8L13 4"/>
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Below card: name + date */}
                                <div className="mt-2 px-0.5">
                                    <Link href={`/cv/${cv.id}`} className="block">
                                        <p className="text-[13px] font-medium text-slate-800 truncate hover:text-blue-600 transition-colors">{cv.title}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(cv.updated_at)}</p>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Click outside to close menu */}
            {menuOpen !== null && (
                <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
            )}

            {showModal && <NewCvModal onClose={() => setShowModal(false)} />}
        </AppLayout>
    );
}