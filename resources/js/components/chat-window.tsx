import { router } from '@inertiajs/react';
import { FileText, Flag, Paperclip, Send, Wifi, X, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatImageViewer } from '@/components/chat-image-viewer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useInitials } from '@/hooks/use-initials';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatAttachment {
    url: string;
    type: 'image' | 'pdf';
    name: string;
}

export interface ChatMessage {
    id: number;
    body: string;
    attachment: ChatAttachment | null;
    sender_id: number;
    is_mine: boolean;
    sender: { name: string; avatar?: string | null };
    read_at: string | null;
    created_at: string;
}

const CHAT_ATTACHMENT_ACCEPT =
    'image/jpeg,image/png,image/gif,image/webp,application/pdf';
const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export interface Conversation {
    id: number;
    vacancy: { id: number; title: string } | null;
    other_user: { id: number; name: string; company?: string; avatar?: string | null };
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

function attachmentTypeFromFile(file: File): 'image' | 'pdf' | null {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return null;
}

function messagesMatch(optimistic: ChatMessage, confirmed: ChatMessage): boolean {
    if (optimistic.body !== confirmed.body) return false;
    const opt = optimistic.attachment;
    const conf = confirmed.attachment;
    if (!opt && !conf) return true;
    if (!opt || !conf) return false;
    return opt.type === conf.type && opt.name === conf.name;
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

function ChatAvatar({
    name,
    avatar,
    className,
}: {
    name: string;
    avatar?: string | null;
    className?: string;
}) {
    const getInitials = useInitials();

    return (
        <Avatar className={className}>
            <AvatarImage src={avatar ?? undefined} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-violet-500 text-sm font-semibold text-white">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
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
            <ChatAvatar
                name={conv.other_user.name}
                avatar={conv.other_user.avatar}
                className="h-10 w-10 shrink-0"
            />

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

function Bubble({
    msg,
    onImageClick,
}: {
    msg: ChatMessage;
    onImageClick?: (messageId: number) => void;
}) {
    const hasBody = msg.body.trim().length > 0;

    return (
        <div className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
            {!msg.is_mine && (
                <ChatAvatar
                    name={msg.sender.name}
                    avatar={msg.sender.avatar}
                    className="mr-2 mt-1 h-7 w-7 shrink-0"
                />
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
                {msg.attachment?.type === 'image' && (
                    <button
                        type="button"
                        onClick={() => onImageClick?.(msg.id)}
                        className="group/img relative mb-2 block w-full cursor-zoom-in overflow-hidden rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        aria-label={`View image: ${msg.attachment.name}`}
                    >
                        <img
                            src={msg.attachment.url}
                            alt={msg.attachment.name}
                            className="max-h-64 max-w-full object-contain transition-opacity group-hover/img:opacity-90"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/img:bg-black/20">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/img:opacity-100">
                                <ZoomIn className="h-4 w-4" aria-hidden />
                            </span>
                        </span>
                    </button>
                )}
                {msg.attachment?.type === 'pdf' && (
                    <a
                        href={msg.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                            msg.is_mine
                                ? 'border-blue-400/50 bg-blue-600/40 hover:bg-blue-600/60'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700'
                        }`}
                    >
                        <FileText className="h-5 w-5 shrink-0" />
                        <span className="truncate font-medium">
                            {msg.attachment.name}
                        </span>
                    </a>
                )}
                {hasBody && (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                )}
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
    const [messages, setMessages] = useState<ChatMessage[]>(
        initialMessages.map((m) => ({ ...m, attachment: m.attachment ?? null })),
    );
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [activeConv, setActiveConv] = useState<Conversation | null>(initialActiveConv);
    const [convList, setConvList] = useState<Conversation[]>(conversations);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string | null>(null);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportCategory, setReportCategory] = useState<'scam' | 'insult' | 'other'>('scam');
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportSuccess, setReportSuccess] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Always holds the highest real message id we have seen (never a temp id)
    const lastRealIdRef = useRef<number>(
        initialMessages.filter((m) => m.id < 1_000_000_000).reduce((max, m) => Math.max(max, m.id), 0),
    );

    const viewerImages = useMemo(() => {
        return messages
            .filter((m) => m.attachment?.type === 'image' && m.attachment.url)
            .map((m) => ({
                messageId: m.id,
                url: m.attachment!.url,
                name: m.attachment!.name,
            }));
    }, [messages]);

    const openImageViewer = useCallback(
        (messageId: number) => {
            const idx = viewerImages.findIndex((img) => img.messageId === messageId);
            if (idx >= 0) setViewerIndex(idx);
        },
        [viewerImages],
    );

    // Scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => {
            if (pendingPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(pendingPreview);
            }
        };
    }, [pendingPreview]);

    const clearPendingAttachment = useCallback(() => {
        if (pendingPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(pendingPreview);
        }
        setPendingFile(null);
        setPendingPreview(null);
        setAttachError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [pendingPreview]);

    const selectAttachment = useCallback(
        (file: File | null) => {
            clearPendingAttachment();
            if (!file) return;

            const type = attachmentTypeFromFile(file);
            if (!type) {
                setAttachError('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.');
                return;
            }
            if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
                setAttachError('File must be 10 MB or smaller.');
                return;
            }

            setPendingFile(file);
            setAttachError(null);
            if (type === 'image') {
                setPendingPreview(URL.createObjectURL(file));
            }
        },
        [clearPendingAttachment],
    );

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
                const incoming = ((await res.json()) as ChatMessage[]).map((m) => ({
                    ...m,
                    attachment: m.attachment ?? null,
                }));
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
                                (n) =>
                                    n.is_mine &&
                                    messagesMatch(m, n) &&
                                    !prev.some((p) => p.id === n.id),
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
        setViewerIndex(null);
        clearPendingAttachment();
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
                    const loaded = (props.active_messages ?? []).map((m) => ({
                        ...m,
                        attachment: m.attachment ?? null,
                    }));
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
    }, [clearPendingAttachment]);

    const sendMessage = useCallback(async () => {
        const body = input.trim();
        const file = pendingFile;
        if (!activeConv || sending || (!body && !file)) return;

        setInput('');
        const fileToSend = file;
        const previewUrl = pendingPreview;
        clearPendingAttachment();
        setSending(true);

        const optimisticAttachment: ChatAttachment | null = fileToSend
            ? {
                  url:
                      previewUrl ??
                      (fileToSend.type === 'application/pdf' ? '#' : ''),
                  type: attachmentTypeFromFile(fileToSend) ?? 'image',
                  name: fileToSend.name,
              }
            : null;

        // Optimistic bubble — use a temp id well above any real DB id
        const tempId = Date.now();
        const optimistic: ChatMessage = {
            id: tempId,
            body,
            attachment: optimisticAttachment,
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

            let res: Response;

            if (fileToSend) {
                const form = new FormData();
                if (body) form.append('body', body);
                form.append('attachment', fileToSend);

                res = await fetch(`/chat/${activeConv.id}/messages`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        Accept: 'application/json',
                    },
                    body: form,
                });
            } else {
                res = await fetch(`/chat/${activeConv.id}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ body }),
                });
            }

            if (res.ok) {
                const real = (await res.json()) as ChatMessage;
                // Swap optimistic bubble with the confirmed message
                setMessages((prev) =>
                    prev.map((m) => (m.id === tempId ? { ...real, attachment: real.attachment ?? null } : m)),
                );
                // Advance the lastRealId so the next poll skips this message
                if (real.id > lastRealIdRef.current) {
                    lastRealIdRef.current = real.id;
                }
                const previewBody =
                    real.body.trim() ||
                    (real.attachment?.type === 'image'
                        ? '📷 Photo'
                        : real.attachment?.type === 'pdf'
                          ? '📄 PDF'
                          : '');
                setConvList((prev) =>
                    prev.map((c) =>
                        c.id === activeConv.id
                            ? {
                                  ...c,
                                  latest_message: {
                                      body: previewBody,
                                      created_at: real.created_at,
                                      is_mine: true,
                                  },
                              }
                            : c,
                    ),
                );
            } else {
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
                setAttachError('Could not send your message. Please try again.');
            }
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [
        activeConv,
        input,
        sending,
        currentUserId,
        pendingFile,
        pendingPreview,
        clearPendingAttachment,
    ]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const resetReportForm = useCallback(() => {
        setReportCategory('scam');
        setReportReason('');
        setReportError(null);
        setReportSuccess(null);
    }, []);

    const submitReport = useCallback(async () => {
        if (!activeConv || reportSubmitting) return;

        const reason = reportReason.trim();
        if (reason.length < 10) {
            setReportError('Please describe what happened (at least 10 characters).');
            return;
        }

        setReportSubmitting(true);
        setReportError(null);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                    ?.content ?? '';

            const res = await fetch(`/chat/${activeConv.id}/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    category: reportCategory,
                    reason,
                }),
            });

            const json = (await res.json()) as { message?: string; errors?: Record<string, string[]> };

            if (res.ok) {
                setReportSuccess(json.message ?? 'Report submitted.');
                setReportReason('');
                setTimeout(() => {
                    setReportOpen(false);
                    resetReportForm();
                }, 1500);
            } else {
                const firstError =
                    json.errors?.reason?.[0] ??
                    json.errors?.category?.[0] ??
                    'Could not submit report. Please try again.';
                setReportError(firstError);
            }
        } catch {
            setReportError('Could not submit report. Please try again.');
        } finally {
            setReportSubmitting(false);
        }
    }, [activeConv, reportCategory, reportReason, reportSubmitting, resetReportForm]);

    const groups = groupByDay(messages);

    return (
        <>
        <ChatImageViewer
            images={viewerImages.map(({ url, name }) => ({ url, name }))}
            index={viewerIndex}
            onClose={() => setViewerIndex(null)}
            onIndexChange={setViewerIndex}
        />
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
                            <ChatAvatar
                                name={activeConv.other_user.name}
                                avatar={activeConv.other_user.avatar}
                                className="h-9 w-9"
                            />
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
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetReportForm();
                                        setReportOpen(true);
                                    }}
                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                    title="Report user"
                                    aria-label="Report user"
                                >
                                    <Flag className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Report</span>
                                </button>
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
                                                    <Bubble
                                                        key={m.id}
                                                        msg={m}
                                                        onImageClick={
                                                            openImageViewer
                                                        }
                                                    />
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
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={CHAT_ATTACHMENT_ACCEPT}
                                className="hidden"
                                onChange={(e) => {
                                    selectAttachment(e.target.files?.[0] ?? null);
                                    e.target.value = '';
                                }}
                            />
                            {pendingFile && (
                                <div className="mb-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-800">
                                    {pendingPreview ? (
                                        <img
                                            src={pendingPreview}
                                            alt="Attachment preview"
                                            className="h-14 w-14 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-red-50 text-red-500 dark:bg-red-900/20">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                                            {pendingFile.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {pendingFile.type === 'application/pdf'
                                                ? 'PDF'
                                                : 'Image'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearPendingAttachment}
                                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                                        aria-label="Remove attachment"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            {attachError && (
                                <p className="mb-2 text-xs text-red-500">{attachError}</p>
                            )}
                            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:ring-blue-900/30">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                    aria-label="Attach image or PDF"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>
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
                                    disabled={(!input.trim() && !pendingFile) || sending}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition-all hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-1.5 text-center text-[10px] text-slate-300 dark:text-slate-600">
                                Enter to send · Shift+Enter for new line · Images & PDF up to 10 MB
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
        <Dialog
            open={reportOpen}
            onOpenChange={(open) => {
                setReportOpen(open);
                if (!open) resetReportForm();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Report {activeConv?.other_user.name}</DialogTitle>
                    <DialogDescription>
                        Tell us if this user sent scam messages or insults. Our admin team will
                        review your report.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="report-category">Reason type</Label>
                        <Select
                            value={reportCategory}
                            onValueChange={(value) =>
                                setReportCategory(value as 'scam' | 'insult' | 'other')
                            }
                        >
                            <SelectTrigger id="report-category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scam">Scam / fraud</SelectItem>
                                <SelectItem value="insult">Insult / harassment</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="report-reason">Details</Label>
                        <textarea
                            id="report-reason"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Describe what happened…"
                            rows={4}
                            maxLength={2000}
                            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {reportError && (
                        <p className="text-sm text-red-500">{reportError}</p>
                    )}
                    {reportSuccess && (
                        <p className="text-sm text-emerald-600">{reportSuccess}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setReportOpen(false)}
                        disabled={reportSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={submitReport}
                        disabled={reportSubmitting || reportReason.trim().length < 10}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        {reportSubmitting ? 'Submitting…' : 'Submit report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
