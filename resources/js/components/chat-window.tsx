import { router } from '@inertiajs/react';
import { Send, Wifi } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: number;
    body: string;
    sender_id: number;
    is_mine: boolean;
    sender: { name: string };
    read_at: string | null;
    created_at: string;
}

export interface Conversation {
    id: number;
    vacancy: { id: number; title: string } | null;
    other_user: { id: number; name: string; company?: string };
    latest_message: {
        body: string;
        created_at: string;
        is_mine: boolean;
    } | null;
    unread_count: number;
    status: 'active' | 'closed';
    updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupByDay(messages: ChatMessage[]) {
    const groups: { day: string; messages: ChatMessage[] }[] = [];
    let lastDay = '';
    for (const msg of messages) {
        const day = formatDay(msg.created_at);
        if (day !== lastDay) {
            groups.push({ day, messages: [] });
            lastDay = day;
        }
        groups[groups.length - 1].messages.push(msg);
    }
    return groups;
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConvItem({
    conv,
    active,
    onClick,
}: {
    conv: Conversation;
    active: boolean;
    onClick: () => void;
}) {
    const preview = conv.latest_message
        ? (conv.latest_message.is_mine ? 'You: ' : '') +
          conv.latest_message.body
        : 'No messages yet';

    return (
        <button
            onClick={onClick}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                active
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
                    : ''
            }`}
        >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-sm font-semibold text-white">
                {conv.other_user.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {conv.other_user.name}
                        {conv.other_user.company && (
                            <span className="ml-1 text-xs font-normal text-slate-400">
                                · {conv.other_user.company}
                            </span>
                        )}
                    </span>
                    {conv.latest_message && (
                        <span className="shrink-0 text-xs text-slate-400">
                            {formatTime(conv.latest_message.created_at)}
                        </span>
                    )}
                </div>

                {conv.vacancy && (
                    <div className="mt-0.5 truncate text-xs text-blue-500">
                        re: {conv.vacancy.title}
                    </div>
                )}

                <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {preview}
                    </p>
                    {conv.unread_count > 0 && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
    return (
        <div className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
            {!msg.is_mine && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-xs font-semibold text-white">
                    {msg.sender.name.charAt(0).toUpperCase()}
                </div>
            )}
            <div
                className={`group relative max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.is_mine
                        ? 'rounded-tr-sm bg-blue-500 text-white'
                        : 'rounded-tl-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-600'
                }`}
            >
                {!msg.is_mine && (
                    <p className="mb-0.5 text-xs font-semibold text-blue-500 dark:text-blue-400">
                        {msg.sender.name}
                    </p>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        msg.is_mine ? 'text-blue-200' : 'text-slate-400'
                    }`}
                >
                    {formatTime(msg.created_at)}
                    {msg.is_mine && (
                        <span>{msg.read_at ? '✓✓' : '✓'}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Chat Window ─────────────────────────────────────────────────────────

interface ChatWindowProps {
    conversations: Conversation[];
    activeConversation: Conversation | null;
    initialMessages: ChatMessage[];
    currentUserId: number;
    emptyState?: React.ReactNode;
}

export function ChatWindow({
    conversations,
    activeConversation: initialActiveConv,
    initialMessages,
    currentUserId,
    emptyState,
}: ChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [activeConv, setActiveConv] = useState<Conversation | null>(initialActiveConv);
    const [convList, setConvList] = useState<Conversation[]>(conversations);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    // Always holds the highest real message id we have seen (never a temp id)
    const lastRealIdRef = useRef<number>(
        initialMessages.filter((m) => m.id < 1_000_000_000).reduce((max, m) => Math.max(max, m.id), 0),
    );

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Polling for new messages every 1.5 s
    useEffect(() => {
        if (!activeConv) return;

        let active = true;

        const poll = async () => {
            if (!active) return;
            try {
                const res = await fetch(
                    `/chat/${activeConv.id}/poll?after=${lastRealIdRef.current}`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!res.ok || !active) return;
                const incoming = (await res.json()) as ChatMessage[];
                if (!incoming.length) return;

                // Track highest real id
                const maxId = Math.max(...incoming.map((m) => m.id));
                if (maxId > lastRealIdRef.current) lastRealIdRef.current = maxId;

                setMessages((prev) => {
                    // Replace any optimistic placeholders and append genuinely new messages
                    let next = prev.map((m) => {
                        // If this is an optimistic bubble that the server now confirms, swap it
                        if (m.id > 1_000_000_000 && m.is_mine) {
                            const confirmed = incoming.find(
                                (n) => n.is_mine && n.body === m.body && !prev.some((p) => p.id === n.id),
                            );
                            return confirmed ?? m;
                        }
                        return m;
                    });

                    // Append any truly new messages not yet in the list
                    const existingIds = new Set(next.map((m) => m.id));
                    for (const msg of incoming) {
                        if (!existingIds.has(msg.id)) {
                            next = [...next, msg];
                        }
                    }
                    return next;
                });

                // Update sidebar preview with latest incoming message
                const latest = incoming[incoming.length - 1];
                setConvList((prev) =>
                    prev.map((c) =>
                        c.id === activeConv.id
                            ? {
                                  ...c,
                                  unread_count: 0,
                                  latest_message: {
                                      body: latest.body,
                                      created_at: latest.created_at,
                                      is_mine: latest.is_mine,
                                  },
                              }
                            : c,
                    ),
                );
            } catch {
                // Network hiccup — silently retry next interval
            }
        };

        // Poll immediately then on interval
        poll();
        const timer = setInterval(poll, 1500);

        return () => {
            active = false;
            clearInterval(timer);
        };
    }, [activeConv?.id]);

    const selectConversation = useCallback((conv: Conversation) => {
        setActiveConv(conv);
        setMessages([]);
        lastRealIdRef.current = 0;
        // Navigate to set URL param and load messages via Inertia
        router.get(
            '/chat',
            { conversation: conv.id },
            {
                preserveState: false,
                preserveScroll: false,
                only: ['active_conversation', 'active_messages'],
                onSuccess: (page) => {
                    const props = page.props as unknown as {
                        active_messages: ChatMessage[];
                        active_conversation: Conversation;
                    };
                    const loaded = props.active_messages ?? [];
                    setMessages(loaded);
                    // Advance ref so polling starts from after the loaded messages
                    const maxId = loaded.reduce((max, m) => Math.max(max, m.id), 0);
                    lastRealIdRef.current = maxId;
                    setActiveConv(props.active_conversation ?? conv);

                    // Clear unread in list
                    setConvList((prev) =>
                        prev.map((c) =>
                            c.id === conv.id ? { ...c, unread_count: 0 } : c,
                        ),
                    );
                },
            },
        );
    }, []);

    const sendMessage = useCallback(async () => {
        if (!activeConv || !input.trim() || sending) return;

        const body = input.trim();
        setInput('');
        setSending(true);

        // Optimistic bubble — use a temp id well above any real DB id
        const tempId = Date.now();
        const optimistic: ChatMessage = {
            id: tempId,
            body,
            sender_id: currentUserId,
            is_mine: true,
            sender: { name: 'You' },
            read_at: null,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                    ?.content ?? '';

            const res = await fetch(`/chat/${activeConv.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({ body }),
            });

            if (res.ok) {
                const real = (await res.json()) as ChatMessage;
                // Swap optimistic bubble with the confirmed message
                setMessages((prev) =>
                    prev.map((m) => (m.id === tempId ? real : m)),
                );
                // Advance the lastRealId so the next poll skips this message
                if (real.id > lastRealIdRef.current) {
                    lastRealIdRef.current = real.id;
                }
                setConvList((prev) =>
                    prev.map((c) =>
                        c.id === activeConv.id
                            ? {
                                  ...c,
                                  latest_message: {
                                      body: real.body,
                                      created_at: real.created_at,
                                      is_mine: true,
                                  },
                              }
                            : c,
                    ),
                );
            }
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [activeConv, input, sending, currentUserId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const groups = groupByDay(messages);

    return (
        <div className="flex h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {/* ── Conversation List ── */}
            <div className="flex w-72 shrink-0 flex-col border-r border-slate-200 dark:border-slate-700">
                <div className="flex h-14 items-center border-b border-slate-200 px-4 dark:border-slate-700">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Messages
                    </h2>
                    <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                        {convList.reduce((s, c) => s + c.unread_count, 0) || ''}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {convList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-slate-400 px-4">
                            <span className="text-3xl mb-2">💬</span>
                            No conversations yet
                        </div>
                    ) : (
                        convList.map((c) => (
                            <ConvItem
                                key={c.id}
                                conv={c}
                                active={activeConv?.id === c.id}
                                onClick={() => selectConversation(c)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ── Chat Panel ── */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {activeConv ? (
                    <>
                        {/* Header */}
                        <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-700">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-sm font-bold text-white">
                                {activeConv.other_user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    {activeConv.other_user.name}
                                    {activeConv.other_user.company && (
                                        <span className="ml-1 font-normal text-slate-400">
                                            · {activeConv.other_user.company}
                                        </span>
                                    )}
                                </p>
                                {activeConv.vacancy && (
                                    <p className="truncate text-xs text-blue-500">
                                        re: {activeConv.vacancy.title}
                                    </p>
                                )}
                            </div>
                            <div className="ml-auto flex items-center gap-1.5 text-xs">
                                <span className="flex items-center gap-1 text-emerald-500">
                                    <Wifi className="h-3.5 w-3.5" /> Live
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4 dark:bg-slate-800/50">
                            {groups.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                    No messages yet. Say hello!
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {groups.map((g) => (
                                        <div key={g.day}>
                                            <div className="my-3 flex items-center gap-3">
                                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                                    {g.day}
                                                </span>
                                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                {g.messages.map((m) => (
                                                    <Bubble key={m.id} msg={m} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:ring-blue-900/30">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message… (Enter to send)"
                                    rows={1}
                                    className="max-h-32 flex-1 resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                                    style={{ minHeight: '24px' }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || sending}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition-all hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-1.5 text-center text-[10px] text-slate-300 dark:text-slate-600">
                                Enter to send · Shift+Enter for new line
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                        {emptyState ?? (
                            <>
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                                    <span className="text-3xl">💬</span>
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                                        Select a conversation
                                    </p>
                                    <p className="text-sm text-slate-400 dark:text-slate-500">
                                        Choose from the list on the left to start chatting
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
