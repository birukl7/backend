import { useEffect, useRef, useState } from 'react';
import AiBotAvatar from '@/components/ai-bot-avatar';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreeningQuestionType = 'open' | 'yes_no' | 'multi';

export interface ScreeningQuestion {
    id: string;
    text: string;
    type: ScreeningQuestionType;
    options?: string[];
    required: boolean;
    weight: number; // 1-5
}

export interface JobScreening {
    id?: number;
    vacancy_id: number;
    is_enabled: boolean;
    intro_message: string | null;
    criteria: string[];
    questions: ScreeningQuestion[];
    passing_score: number;
    auto_reject_below: number | null;
}

interface TunerMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface Props {
    vacancyId: number;
}

function csrf() {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? ''
    );
}

function makeQuestionId() {
    return 'q' + Math.random().toString(36).slice(2, 7);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployerScreeningSetup({ vacancyId }: Props) {
    const [screening, setScreening] = useState<JobScreening | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI tuner panel state
    const [tunerOpen, setTunerOpen] = useState(true);
    const [tunerHistory, setTunerHistory] = useState<TunerMessage[]>([]);
    const [tunerInput, setTunerInput] = useState('');
    const [tunerThinking, setTunerThinking] = useState(false);
    const tunerScrollRef = useRef<HTMLDivElement>(null);

    // ── Fetch current screening config ───────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/employer/jobs/${vacancyId}/screening`, {
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) { setError('Could not load screening.'); return; }
                const data = await res.json();
                if (cancelled) return;
                setScreening({
                    id:                data.screening?.id,
                    vacancy_id:        vacancyId,
                    is_enabled:        !!data.screening?.is_enabled,
                    intro_message:     data.screening?.intro_message ?? '',
                    criteria:          Array.isArray(data.screening?.criteria) ? data.screening.criteria : [],
                    questions:         Array.isArray(data.screening?.questions) ? data.screening.questions : [],
                    passing_score:     data.screening?.passing_score ?? 60,
                    auto_reject_below: data.screening?.auto_reject_below ?? null,
                });
            } catch {
                setError('Network error.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [vacancyId]);

    // ── Auto-scroll tuner ─────────────────────────────────────────────────
    useEffect(() => {
        tunerScrollRef.current?.scrollTo({ top: tunerScrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [tunerHistory, tunerThinking]);

    function update<K extends keyof JobScreening>(key: K, value: JobScreening[K]) {
        setScreening((prev) => (prev ? { ...prev, [key]: value } : prev));
        setSaved(false);
    }

    async function save() {
        if (!screening || saving) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/employer/jobs/${vacancyId}/screening`, {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({
                    is_enabled:        screening.is_enabled,
                    intro_message:     screening.intro_message ?? '',
                    criteria:          screening.criteria,
                    questions:         screening.questions,
                    passing_score:     screening.passing_score,
                    auto_reject_below: screening.auto_reject_below,
                }),
            });
            if (!res.ok) {
                setError('Could not save. Please check the values and try again.');
                return;
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
        } catch {
            setError('Network error.');
        } finally {
            setSaving(false);
        }
    }

    async function tunerSend() {
        if (!tunerInput.trim() || tunerThinking) return;
        const msg = tunerInput.trim();
        setTunerInput('');
        setTunerHistory((prev) => [...prev, { role: 'user', content: msg }]);
        setTunerThinking(true);

        try {
            const res = await fetch(`/employer/jobs/${vacancyId}/screening/tune`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({
                    message: msg,
                    history: tunerHistory,
                }),
            });
            if (!res.ok) {
                setTunerHistory((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not respond just now.' }]);
                return;
            }
            const data = await res.json();
            const reply = (data.reply as string) ?? 'Here are some suggestions.';
            setTunerHistory((prev) => [...prev, { role: 'assistant', content: reply }]);

            // Auto-apply suggestions if present
            const sQ = data.suggested_questions as ScreeningQuestion[] | undefined;
            const sC = data.suggested_criteria  as string[]            | undefined;

            if (screening && (sQ?.length || sC?.length)) {
                const next = { ...screening };
                if (sQ?.length) {
                    // Merge: replace existing if same id, otherwise append
                    const byId = new Map(next.questions.map((q) => [q.id, q]));
                    for (const q of sQ) byId.set(q.id, q);
                    next.questions = Array.from(byId.values());
                }
                if (sC?.length) {
                    const merged = new Set([...next.criteria, ...sC]);
                    next.criteria = Array.from(merged);
                }
                setScreening(next);
                setSaved(false);
            }
        } catch {
            setTunerHistory((prev) => [...prev, { role: 'assistant', content: 'Network error.' }]);
        } finally {
            setTunerThinking(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <svg className="h-5 w-5 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            </div>
        );
    }

    if (!screening) {
        return <p className="py-8 text-center text-sm text-slate-400">Could not load screening configuration.</p>;
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* Enable banner */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 px-5 py-4">
                <div className="flex items-center gap-3">
                    <AiBotAvatar size="md" />
                    <div>
                        <p className="text-[14px] font-bold text-slate-900">AI Smart Screening</p>
                        <p className="text-[12px] text-slate-500">
                            When enabled, candidates chat with an AI before applying — you get a scored report.
                        </p>
                    </div>
                </div>
                <Toggle
                    on={screening.is_enabled}
                    onChange={(v) => update('is_enabled', v)}
                />
            </div>

            {/* AI Tuner */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
                <button
                    onClick={() => setTunerOpen((p) => !p)}
                    className="flex w-full items-center justify-between gap-2 bg-slate-50 px-5 py-3 text-left transition-colors hover:bg-slate-100"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <span className="text-[13px] font-semibold text-slate-700">
                            AI Tuner — let AI design the questions
                        </span>
                    </div>
                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${tunerOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                </button>

                {tunerOpen && (
                    <div className="space-y-3 px-5 py-4">
                        <div ref={tunerScrollRef} className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                            {tunerHistory.length === 0 && (
                                <p className="px-1 py-2 text-[12px] text-slate-400">
                                    Tip: tell the AI about your priorities. e.g. <em>“We need strong React and someone comfortable with on-call rotation.”</em>
                                </p>
                            )}
                            {tunerHistory.map((m, i) => (
                                <TunerBubble key={i} role={m.role} text={m.content} />
                            ))}
                            {tunerThinking && <TunerBubble role="assistant" text="" typing />}
                        </div>
                        <div className="flex items-end gap-2">
                            <textarea
                                rows={2}
                                value={tunerInput}
                                onChange={(e) => setTunerInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        tunerSend();
                                    }
                                }}
                                placeholder="Describe what matters for this role…"
                                className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                            <button
                                onClick={tunerSend}
                                disabled={tunerThinking || !tunerInput.trim()}
                                className="flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {tunerThinking ? 'Thinking…' : 'Ask AI'}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Any suggestions the AI returns will be added automatically to the lists below — you can still edit them.
                        </p>
                    </div>
                )}
            </div>

            {/* Intro message */}
            <Section title="Intro Message" hint="First message shown to the candidate">
                <textarea
                    rows={2}
                    value={screening.intro_message ?? ''}
                    onChange={(e) => update('intro_message', e.target.value)}
                    placeholder="Hi! I'm the AI screener for this role…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
            </Section>

            {/* Criteria */}
            <Section title="Evaluation Criteria" hint="Short statements the AI checks the candidate against">
                <ChipList
                    items={screening.criteria}
                    placeholder="e.g. 3+ years React experience"
                    onChange={(next) => update('criteria', next)}
                />
            </Section>

            {/* Questions */}
            <Section title="Screening Questions" hint="The AI will weave these into a natural conversation">
                <QuestionsEditor
                    questions={screening.questions}
                    onChange={(next) => update('questions', next)}
                />
            </Section>

            {/* Thresholds */}
            <Section title="Scoring Thresholds" hint="AI score (0-100). Pass = auto-shortlist. Reject = auto-reject.">
                <div className="grid grid-cols-2 gap-4">
                    <NumberRow
                        label="Passing score (auto-shortlist)"
                        value={screening.passing_score}
                        onChange={(v) => update('passing_score', Math.max(0, Math.min(100, v)))}
                    />
                    <NumberRow
                        label="Auto-reject below"
                        value={screening.auto_reject_below ?? 0}
                        placeholder="0 = off"
                        onChange={(v) => update('auto_reject_below', v <= 0 ? null : Math.min(100, v))}
                    />
                </div>
            </Section>

            {/* Save bar */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
                    {error}
                </div>
            )}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <div className="text-[12px] text-slate-400">
                    {screening.questions.length} question{screening.questions.length !== 1 ? 's' : ''} · {screening.criteria.length} criteri{screening.criteria.length === 1 ? 'on' : 'a'}
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" clipRule="evenodd" />
                            </svg>
                            Saved
                        </span>
                    )}
                    <button
                        onClick={save}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving && (
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        )}
                        {saving ? 'Saving…' : 'Save Screening'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between">
                <h4 className="text-[12px] font-bold tracking-widest text-slate-500 uppercase">{title}</h4>
                {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
            </div>
            {children}
        </div>
    );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!on)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-slate-300'}`}
            title={on ? 'Enabled' : 'Disabled'}
        >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
    );
}

function ChipList({ items, placeholder, onChange }: { items: string[]; placeholder: string; onChange: (next: string[]) => void }) {
    const [input, setInput] = useState('');
    function add() {
        if (!input.trim()) return;
        onChange([...items, input.trim()]);
        setInput('');
    }
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-700">
                        {item}
                        <button onClick={() => onChange(items.filter((_, k) => k !== i))} className="text-indigo-400 hover:text-red-500">
                            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                        </button>
                    </span>
                ))}
                {items.length === 0 && <span className="text-[12px] text-slate-300 italic">No criteria yet</span>}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder={placeholder}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button onClick={add} disabled={!input.trim()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50">
                    Add
                </button>
            </div>
        </div>
    );
}

function NumberRow({ label, value, placeholder, onChange }: { label: string; value: number; placeholder?: string; onChange: (v: number) => void }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
            <input
                type="number"
                min={0}
                max={100}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
        </label>
    );
}

function QuestionsEditor({ questions, onChange }: { questions: ScreeningQuestion[]; onChange: (next: ScreeningQuestion[]) => void }) {
    function update(i: number, patch: Partial<ScreeningQuestion>) {
        onChange(questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));
    }
    function add() {
        onChange([
            ...questions,
            {
                id: makeQuestionId(),
                text: '',
                type: 'open',
                options: [],
                required: true,
                weight: 3,
            },
        ]);
    }
    function remove(i: number) {
        onChange(questions.filter((_, k) => k !== i));
    }
    return (
        <div className="space-y-2">
            {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                        <span className="mt-1 text-[10px] font-bold tracking-widest text-slate-300">Q{i + 1}</span>
                        <textarea
                            rows={1}
                            value={q.text}
                            onChange={(e) => update(i, { text: e.target.value })}
                            placeholder="Question text…"
                            className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />
                        <button onClick={() => remove(i)} className="mt-1 text-slate-300 hover:text-red-500">
                            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" d="M2 4h12M5 4V2.5h6V4M3.5 4l.5 9.5h8L13 4" />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                        <select
                            value={q.type}
                            onChange={(e) => update(i, { type: e.target.value as ScreeningQuestionType })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 outline-none focus:border-indigo-400"
                        >
                            <option value="open">Open answer</option>
                            <option value="yes_no">Yes / No</option>
                            <option value="multi">Multiple choice</option>
                        </select>

                        {q.type === 'multi' && (
                            <input
                                value={(q.options ?? []).join(', ')}
                                onChange={(e) => update(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                                placeholder="comma, separated, options"
                                className="flex-1 min-w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-800 outline-none focus:border-indigo-400"
                            />
                        )}

                        <label className="flex items-center gap-1.5 text-[12px] text-slate-600">
                            <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => update(i, { required: e.target.checked })}
                                className="rounded"
                            />
                            Required
                        </label>

                        <label className="flex items-center gap-1.5 text-[12px] text-slate-600">
                            Weight
                            <select
                                value={q.weight}
                                onChange={(e) => update(i, { weight: parseInt(e.target.value, 10) })}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 outline-none focus:border-indigo-400"
                            >
                                {[1, 2, 3, 4, 5].map((w) => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
            ))}
            <button
                onClick={add}
                className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-[12px] font-medium text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
            >
                + Add question
            </button>
        </div>
    );
}

function TunerBubble({ role, text, typing = false }: { role: 'user' | 'assistant'; text: string; typing?: boolean }) {
    if (role === 'assistant') {
        return (
            <div className="flex items-start gap-2">
                <AiBotAvatar size="xs" />
                <div className="max-w-[85%] rounded-xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-relaxed whitespace-pre-line text-slate-700">
                    {typing ? <span className="text-slate-300">Thinking…</span> : text}
                </div>
            </div>
        );
    }
    return (
        <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-tr-md bg-indigo-600 px-3 py-2 text-[12px] leading-relaxed whitespace-pre-line text-white">
                {text}
            </div>
        </div>
    );
}
