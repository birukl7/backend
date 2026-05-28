import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Suggestion {
    section: string;
    advice: string;
}

interface Improvement {
    section: string;
    current: string;
    suggested: string;
}

interface SummaryPayload {
    cached: boolean;
    ai_summary: string;
    ai_suggestions: Suggestion[] | null;
    ai_improvements: Improvement[] | null;
    ai_strength_score: number | null;
    generated_at: string | null;
    configured: boolean;
}

interface Props {
    cvId: number;
    open: boolean;
    /** CV updated_at — when this changes, suggestions are stale */
    contentVersion: string;
    onClose: () => void;
    /** Called after applying the AI summary to the CV's summary field */
    onApplied?: (summary: string) => void;
}

function csrf() {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? ''
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiCvSummaryDrawer({ cvId, open, contentVersion, onClose, onApplied }: Props) {
    const [data, setData]         = useState<SummaryPayload | null>(null);
    const [loading, setLoading]   = useState(false);
    const [applying, setApplying] = useState(false);
    const [copied, setCopied]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [fetchedFor, setFetchedFor] = useState<string | null>(null);

    // Refetch whenever the drawer opens or the CV content changes
    useEffect(() => {
        if (!open) return;
        if (fetchedFor === contentVersion && data) return;
        void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, contentVersion]);

    // Clear stale in-memory data when drawer closes
    useEffect(() => {
        if (!open) {
            setData(null);
            setFetchedFor(null);
            setError(null);
        }
    }, [open]);

    async function load(useCached: boolean) {
        setLoading(true);
        setError(null);
        try {
            const url = `/cv/${cvId}/ai-summary${useCached ? '?cached=1' : ''}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            if (!res.ok) {
                setError('Could not generate summary. Please try again.');
                return;
            }
            const payload = await res.json();
            setData(payload);
            setFetchedFor(contentVersion);
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    }

    async function apply() {
        if (!data?.ai_summary || applying) return;
        setApplying(true);
        try {
            const res = await fetch(`/cv/${cvId}/use-ai-summary`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            if (!res.ok) {
                setError('Could not apply summary.');
                return;
            }
            const { summary } = await res.json();
            onApplied?.(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Network error.');
        } finally {
            setApplying(false);
        }
    }

    if (!open) return null;

    const score = data?.ai_strength_score ?? null;
    const barColor =
        score === null ? 'bg-slate-300' :
        score >= 80    ? 'bg-emerald-500' :
        score >= 60    ? 'bg-blue-500' :
        score >= 35    ? 'bg-amber-400' : 'bg-red-400';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
                onClick={onClose}
            />
            {/* Drawer */}
            <div className="fixed top-0 right-0 z-50 flex h-full w-[480px] max-w-full flex-col bg-white shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-slate-900">AI Resume Coach</p>
                            <p className="text-[12px] text-slate-400">
                                {loading ? 'Reading your CV…' : data?.cached ? 'Up to date' : data ? 'Fresh from AI' : 'Generating…'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {loading && !data && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <svg className="h-8 w-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <p className="text-[13px] text-slate-400">Reading your CV…</p>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-600">
                            {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Strength score */}
                            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/40 to-violet-50/40 px-5 py-4">
                                <div className="mb-1.5 flex items-baseline justify-between">
                                    <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Resume Strength</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {score ?? '—'}
                                        <span className="text-base text-slate-400">/100</span>
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white">
                                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score ?? 0}%` }} />
                                </div>
                            </div>

                            {/* AI Summary */}
                            <section>
                                <h4 className="mb-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                                    Suggested Summary
                                </h4>
                                <div className="relative rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white px-4 py-3">
                                    <p className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">
                                        {data.ai_summary}
                                    </p>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <button
                                        onClick={apply}
                                        disabled={applying || !data.ai_summary}
                                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        {applying ? (
                                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                        ) : copied ? (
                                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M5 1.75A1.75 1.75 0 016.75 0h6.5C14.216 0 15 .784 15 1.75v6.5A1.75 1.75 0 0113.25 10h-6.5A1.75 1.75 0 015 8.25v-6.5z" />
                                                <path d="M1 5.75C1 4.784 1.784 4 2.75 4h2v1.5h-2a.25.25 0 00-.25.25v6.5c0 .138.112.25.25.25h6.5a.25.25 0 00.25-.25v-2H11v2A1.75 1.75 0 019.25 14h-6.5A1.75 1.75 0 011 12.25v-6.5z" />
                                            </svg>
                                        )}
                                        {copied ? 'Applied to CV' : applying ? 'Applying…' : 'Use this summary'}
                                    </button>
                                    <button
                                        onClick={() => load(false)}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-indigo-600 disabled:opacity-50"
                                        title="Generate fresh"
                                    >
                                        <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M8 3a5 5 0 014.546 2.914.75.75 0 001.364-.628A6.5 6.5 0 001.5 8H.5a.5.5 0 00-.354.854l1.5 1.5a.5.5 0 00.708 0l1.5-1.5A.5.5 0 003.5 8H3a5 5 0 015-5z" />
                                            <path d="M8 13a5 5 0 01-4.546-2.914.75.75 0 10-1.364.628A6.5 6.5 0 0014.5 8h1a.5.5 0 00.354-.854l-1.5-1.5a.5.5 0 00-.708 0l-1.5 1.5A.5.5 0 0012.5 8H13a5 5 0 01-5 5z" />
                                        </svg>
                                        Regenerate
                                    </button>
                                </div>
                            </section>

                            {/* Suggestions */}
                            {(data.ai_suggestions?.length ?? 0) > 0 && (
                                <section>
                                    <h4 className="mb-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                                        Where to Improve
                                    </h4>
                                    <ul className="space-y-2">
                                        {data.ai_suggestions!.map((s, i) => (
                                            <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                <span className="mt-0.5 flex h-5 shrink-0 items-center rounded-full bg-amber-50 px-2 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                                                    {s.section}
                                                </span>
                                                <p className="text-[13px] leading-relaxed text-slate-700">{s.advice}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* Before/After rewrites */}
                            {(data.ai_improvements?.length ?? 0) > 0 && (
                                <section>
                                    <h4 className="mb-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                                        Suggested Rewrites
                                    </h4>
                                    <div className="space-y-3">
                                        {data.ai_improvements!.map((m, i) => (
                                            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                                                    {m.section}
                                                </div>
                                                <div className="space-y-1.5 px-4 py-3">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase">Before</p>
                                                    <p className="rounded-lg bg-red-50/60 px-3 py-2 text-[12px] leading-relaxed text-slate-600">{m.current}</p>
                                                    <p className="mt-2 text-[11px] font-bold text-slate-400 uppercase">After</p>
                                                    <p className="rounded-lg bg-emerald-50/60 px-3 py-2 text-[12px] leading-relaxed text-slate-800">{m.suggested}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {!data.configured && (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                                    AI is not configured on the server — these are general fallback tips. Add a Groq or OpenAI key to get tailored suggestions.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <style>{`
                    @keyframes slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    .animate-slide-in-right { animation: slide-in-right 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
                `}</style>
            </div>
        </>
    );
}
