import { useEffect, useRef, useState } from 'react';
import AiBotAvatar from '@/components/ai-bot-avatar';

interface ChatMessage {
    role: 'ai' | 'user';
    text: string;
    ts?: string;
    qid?: string | null;
    done?: boolean;
}

interface Props {
    vacancyId: number;
    vacancyTitle: string;
    onClose: () => void;
    onComplete: () => void;
}

function csrf() {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

export default function ScreeningChat({
    vacancyId,
    vacancyTitle,
    onClose,
    onComplete,
}: Props) {
    const [responseId, setResponseId] = useState<number | null>(null);
    const [transcript, setTranscript] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Start the screening session on mount ──────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/screening/${vacancyId}/start`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf(),
                    },
                });
                if (!res.ok) {
                    setError('Could not start the screening. Please try again.');
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                setResponseId(data.response_id);
                setTranscript(data.transcript ?? []);
            } catch {
                setError('Network error.');
            }
        })();
        return () => { cancelled = true; };
    }, [vacancyId]);

    // ── Auto-scroll on new message ────────────────────────────────────────
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [transcript, sending, finishing]);

    async function send() {
        if (!input.trim() || sending || !responseId || done) return;
        const userText = input.trim();
        setInput('');
        setSending(true);
        setError(null);

        // Optimistically show the user turn
        setTranscript((prev) => [...prev, { role: 'user', text: userText }]);

        try {
            const res = await fetch(`/screening/${responseId}/message`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({ message: userText }),
            });
            if (!res.ok) {
                setError('Could not send your reply. Please try again.');
                return;
            }
            const data = await res.json();
            setTranscript(data.transcript ?? []);
            if (data.done) setDone(true);
        } catch {
            setError('Network error.');
        } finally {
            setSending(false);
        }
    }

    async function complete() {
        if (!responseId || finishing) return;
        setFinishing(true);
        setError(null);
        try {
            const res = await fetch(`/screening/${responseId}/complete`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            if (!res.ok) {
                setError('Could not finalise screening. Please try again.');
                return;
            }
            onComplete();
        } catch {
            setError('Network error.');
        } finally {
            setFinishing(false);
        }
    }

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[4px]"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="animate-dialog-in flex h-[640px] max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <AiBotAvatar size="md" />
                            <div className="min-w-0">
                                <h2 className="text-[15px] leading-tight font-bold text-slate-900">
                                    AI Screening
                                </h2>
                                <p className="truncate text-[12px] text-slate-400">
                                    {vacancyTitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="Close"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                            </svg>
                        </button>
                    </div>

                    {/* Chat scroll */}
                    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 px-6 py-5">
                        {transcript.length === 0 && !error && (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    <span className="text-[13px]">Starting screening…</span>
                                </div>
                            </div>
                        )}
                        {transcript.map((m, i) => (
                            <ChatBubble key={i} role={m.role} text={m.text} />
                        ))}
                        {sending && <ChatBubble role="ai" text="" typing />}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="shrink-0 border-t border-red-100 bg-red-50 px-6 py-2.5 text-[12px] text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
                        {done ? (
                            <div className="space-y-3 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                                    <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-[14px] font-semibold text-slate-800">
                                    Screening complete
                                </p>
                                <p className="text-[12px] text-slate-400">
                                    Click below to submit your screening to the employer.
                                </p>
                                <button
                                    onClick={complete}
                                    disabled={finishing}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {finishing && (
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                    )}
                                    {finishing ? 'Submitting…' : 'Submit screening'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-end gap-2">
                                <textarea
                                    rows={2}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            send();
                                        }
                                    }}
                                    disabled={sending || !responseId}
                                    placeholder="Type your answer…"
                                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                                />
                                <button
                                    onClick={send}
                                    disabled={sending || !input.trim() || !responseId}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Send"
                                >
                                    {sending ? (
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                                            <path d="M14.354 1.646a.5.5 0 01.13.515l-4.5 13a.5.5 0 01-.928.054L6.5 9.5 1.785 6.943a.5.5 0 01.054-.928l13-4.5a.5.5 0 01.515.131z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function ChatBubble({
    role,
    text,
    typing = false,
}: {
    role: 'ai' | 'user';
    text: string;
    typing?: boolean;
}) {
    if (role === 'ai') {
        return (
            <div className="flex items-start gap-2.5">
                <AiBotAvatar />
                <div className="max-w-[80%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-slate-700 shadow-sm">
                    {typing ? (
                        <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" style={{ animationDelay: '0.15s' }} />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" style={{ animationDelay: '0.3s' }} />
                        </span>
                    ) : text}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-white shadow-sm">
                {text}
            </div>
        </div>
    );
}
