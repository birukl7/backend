import { useEffect, useState } from 'react';

interface EmployerBrief {
    summary: string;
    highlights: string[];
    gaps: string[];
    years_experience: number;
    core_skills: string[];
}

interface Payload {
    configured: boolean;
    brief: EmployerBrief;
}

interface Props {
    applicationId: number;
}

export default function EmployerCvBrief({ applicationId }: Props) {
    const [data, setData]       = useState<Payload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [open, setOpen]       = useState(false);

    async function load() {
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/employer/applications/${applicationId}/cv-summary`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) {
                setError('Could not generate AI brief.');
                return;
            }
            setData(await res.json());
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    }

    // Auto-load when expanded for the first time
    useEffect(() => {
        if (open && !data && !loading) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-violet-50/40">
            <button
                onClick={() => setOpen((p) => !p)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-white/50"
            >
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">AI Resume Brief</p>
                        <p className="text-[11px] text-slate-500">
                            {open ? (loading ? 'Generating…' : 'Auto-generated from the CV') : 'Click to summarise this CV'}
                        </p>
                    </div>
                </div>
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {open && (
                <div className="space-y-4 border-t border-indigo-100 bg-white/70 px-5 py-4">
                    {loading && !data && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-400">
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Reading the resume…
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
                            {error}{' '}
                            <button onClick={load} className="font-semibold underline">Retry</button>
                        </div>
                    )}

                    {data && (
                        <>
                            <p className="text-[13px] leading-relaxed text-slate-700">{data.brief.summary}</p>

                            <div className="flex flex-wrap items-center gap-2">
                                {data.brief.years_experience > 0 && (
                                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                                        ~{data.brief.years_experience} yr{data.brief.years_experience === 1 ? '' : 's'} exp
                                    </span>
                                )}
                                {data.brief.core_skills.slice(0, 8).map((s, i) => (
                                    <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                        {s}
                                    </span>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <BriefList
                                    color="emerald"
                                    title="Highlights"
                                    items={data.brief.highlights}
                                />
                                <BriefList
                                    color="amber"
                                    title="Gaps"
                                    items={data.brief.gaps}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                {!data.configured && (
                                    <p className="text-[11px] text-amber-600">
                                        Server has no AI key — showing basic fallback.
                                    </p>
                                )}
                                <button
                                    onClick={load}
                                    disabled={loading}
                                    className="ml-auto text-[11px] font-medium text-slate-500 hover:text-indigo-600 disabled:opacity-50"
                                >
                                    Regenerate
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function BriefList({ title, color, items }: { title: string; color: 'emerald' | 'amber'; items: string[] }) {
    const dotCls   = color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
    const titleCls = color === 'emerald' ? 'text-emerald-600' : 'text-amber-600';
    return (
        <div>
            <p className={`mb-1 text-[10px] font-bold tracking-widest uppercase ${titleCls}`}>{title}</p>
            {items.length === 0 ? (
                <p className="text-[11px] text-slate-300 italic">None detected</p>
            ) : (
                <ul className="space-y-1">
                    {items.map((it, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-700">
                            <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${dotCls}`} />
                            {it}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
