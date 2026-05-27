import { useState } from 'react';

export interface ScreeningResponseData {
    id: number;
    vacancy_id: number;
    user_id: number;
    application_id: number | null;
    transcript: Array<{ role: 'ai' | 'user'; text: string; ts?: string; qid?: string | null }> | null;
    answers: Record<string, string> | null;
    ai_score: number | null;
    ai_summary: string | null;
    ai_strengths: string[] | null;
    ai_concerns: string[] | null;
    recommendation: 'strong_match' | 'good_match' | 'weak_match' | 'not_recommended' | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    completed_at: string | null;
}

interface Props {
    response: ScreeningResponseData;
}

const REC_STYLE: Record<NonNullable<ScreeningResponseData['recommendation']>, { label: string; cls: string; dot: string }> = {
    strong_match:    { label: 'Strong Match',    cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
    good_match:      { label: 'Good Match',      cls: 'bg-blue-50 border-blue-200 text-blue-700',          dot: 'bg-blue-500' },
    weak_match:      { label: 'Weak Match',      cls: 'bg-amber-50 border-amber-200 text-amber-700',       dot: 'bg-amber-500' },
    not_recommended: { label: 'Not Recommended', cls: 'bg-red-50 border-red-200 text-red-600',             dot: 'bg-red-500' },
};

export default function ScreeningReport({ response }: Props) {
    const [showTranscript, setShowTranscript] = useState(false);

    if (response.status !== 'completed' || response.ai_score === null) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
                Screening was not completed by the candidate.
            </div>
        );
    }

    const score = response.ai_score;
    const rec   = response.recommendation ?? 'weak_match';
    const recCfg = REC_STYLE[rec];
    const barColor =
        score >= 80 ? 'bg-emerald-500' :
        score >= 60 ? 'bg-blue-500' :
        score >= 35 ? 'bg-amber-400' : 'bg-red-400';

    return (
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-violet-50/50">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-indigo-100/70 bg-white/60 px-5 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">AI Screening Report</p>
                        <p className="text-[11px] text-slate-400">
                            {response.completed_at
                                ? new Date(response.completed_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                })
                                : 'Completed'}
                        </p>
                    </div>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${recCfg.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${recCfg.dot}`} />
                    {recCfg.label}
                </span>
            </div>

            {/* Score */}
            <div className="border-b border-indigo-100/70 px-5 py-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">AI Score</span>
                    <span className="text-2xl font-bold text-slate-900">
                        {score}
                        <span className="text-base text-slate-400">/100</span>
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                </div>
                {response.ai_summary && (
                    <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{response.ai_summary}</p>
                )}
            </div>

            {/* Strengths & Concerns */}
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                <BulletList
                    title="Strengths"
                    color="emerald"
                    icon={
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                        </svg>
                    }
                    items={response.ai_strengths ?? []}
                />
                <BulletList
                    title="Concerns"
                    color="amber"
                    icon={
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 4.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.75zm0 7a1 1 0 100-2 1 1 0 000 2z" />
                        </svg>
                    }
                    items={response.ai_concerns ?? []}
                />
            </div>

            {/* Transcript toggle */}
            <div className="border-t border-indigo-100/70 bg-white/60 px-5 py-3">
                <button
                    onClick={() => setShowTranscript((p) => !p)}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                    <svg className={`h-3.5 w-3.5 transition-transform ${showTranscript ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                    {showTranscript ? 'Hide transcript' : 'View full transcript'}
                </button>

                {showTranscript && (
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                        {(response.transcript ?? []).map((m, i) =>
                            m.role === 'ai' ? (
                                <div key={i} className="flex items-start gap-2">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white">AI</div>
                                    <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] leading-relaxed whitespace-pre-line text-slate-700">{m.text}</p>
                                </div>
                            ) : (
                                <div key={i} className="flex justify-end">
                                    <p className="max-w-[80%] rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[12px] leading-relaxed whitespace-pre-line text-white">{m.text}</p>
                                </div>
                            )
                        )}
                        {(!response.transcript || response.transcript.length === 0) && (
                            <p className="text-[12px] text-slate-400 italic">No transcript recorded.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function BulletList({ title, color, items, icon }: {
    title: string;
    color: 'emerald' | 'amber';
    items: string[];
    icon: React.ReactNode;
}) {
    const colorCls: Record<string, string> = {
        emerald: 'text-emerald-600 bg-emerald-50',
        amber:   'text-amber-600 bg-amber-50',
    };
    return (
        <div className="border-indigo-100/70 px-5 py-4 md:[&:not(:first-child)]:border-l">
            <div className="mb-2 flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${colorCls[color]}`}>{icon}</span>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">{title}</p>
            </div>
            {items.length === 0 ? (
                <p className="text-[12px] text-slate-300 italic">No items detected.</p>
            ) : (
                <ul className="space-y-1.5">
                    {items.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-700">
                            <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
