import { Link, router, usePage } from '@inertiajs/react';
import { Bell, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { VacancyPreviewModal } from '@/components/vacancy-preview-modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppNotification {
    id: number;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

    if (diff < 60) {
        return 'just now';
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}h ago`;
    }

    return `${Math.floor(diff / 86400)}d ago`;
}

function csrf(): string {
    return (
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content ?? ''
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
    const { unread_notifications_count } = usePage().props as Record<
        string,
        unknown
    >;

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [previewVacancyId, setPreviewVacancyId] = useState<number | null>(
        null,
    );
    const [unreadCount, setUnreadCount] = useState<number>(
        typeof unread_notifications_count === 'number'
            ? unread_notifications_count
            : 0,
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // ── Outside-click detection ───────────────────────────────────────────────
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleOutsideClick(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [open]);

    // ── Fetch helpers ─────────────────────────────────────────────────────────

    async function fetchNotifications() {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setLoading(true);

        try {
            const r = await fetch('/api/notifications', {
                signal: abortRef.current.signal,
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            const data = await r.json();

            setNotifications(data.notifications ?? []);
            setUnreadCount(data.unread_count ?? 0);
        } catch {
            // keep stale data on network error / abort
        } finally {
            setLoading(false);
        }
    }

    function handleBellClick() {
        const next = !open;

        setOpen(next);

        if (next) {
            void fetchNotifications();
        } else {
            abortRef.current?.abort();
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    async function markRead(id: number) {
        await fetch(`/notifications/${id}/read`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
        });

        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
            ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
    }

    async function deleteNotification(id: number, wasUnread: boolean) {
        await fetch(`/notifications/${id}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
        });

        setNotifications((prev) => prev.filter((n) => n.id !== id));

        if (wasUnread) {
            setUnreadCount((c) => Math.max(0, c - 1));
        }
    }

    async function markAllRead() {
        await fetch('/notifications/read-all', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrf(),
            },
        });

        setNotifications((prev) =>
            prev.map((n) => ({
                ...n,
                read_at: n.read_at ?? new Date().toISOString(),
            })),
        );
        setUnreadCount(0);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div ref={containerRef} className="relative">
            {/* Bell button */}
            <button
                onClick={handleBellClick}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-neutral-700"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] leading-none font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full right-0 z-50 mt-2 flex max-h-96 w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-neutral-700">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Notifications
                        </p>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500 dark:bg-red-900/30 dark:text-red-400">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <svg
                                    className="h-5 w-5 animate-spin text-blue-400"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8H4z"
                                    />
                                </svg>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-center">
                                <Bell className="mb-2 h-8 w-8 text-slate-200 dark:text-neutral-600" />
                                <p className="text-sm text-slate-400 dark:text-slate-500">
                                    No notifications yet
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-neutral-700">
                                {notifications.map((n) => {
                                    const isUnread = n.read_at === null;

                                    return (
                                        <div
                                            key={n.id}
                                            className={`relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-700/50 ${
                                                isUnread
                                                    ? 'border-l-2 border-blue-400 bg-blue-50/40 dark:bg-blue-900/10'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                if (isUnread)
                                                    void markRead(n.id);
                                                const reportId = n.data?.chat_report_id;
                                                if (reportId) {
                                                    setOpen(false);
                                                    router.visit(
                                                        `/admin/chat-reports/${reportId}`,
                                                    );
                                                    return;
                                                }
                                                if (n.type === 'new_application') {
                                                    setOpen(false);
                                                    router.visit('/employer/applications');
                                                    return;
                                                }
                                                const vid = n.data?.vacancy_id;
                                                if (vid) {
                                                    setOpen(false);
                                                    setPreviewVacancyId(
                                                        Number(vid),
                                                    );
                                                }
                                            }}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] leading-tight font-semibold text-slate-900 dark:text-slate-100">
                                                    {n.title}
                                                </p>
                                                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
                                                    {n.body}
                                                </p>
                                                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                                    {timeAgo(n.created_at)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void deleteNotification(
                                                        n.id,
                                                        isUnread,
                                                    );
                                                }}
                                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-200 hover:text-slate-500 dark:text-neutral-500 dark:hover:bg-neutral-600 dark:hover:text-neutral-300"
                                                aria-label="Delete notification"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/80">
                        <button
                            onClick={() => void markAllRead()}
                            disabled={unreadCount === 0}
                            className="text-[12px] font-medium text-blue-500 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-blue-400 dark:disabled:text-neutral-600"
                        >
                            Mark all read
                        </button>
                        <Link
                            href="/notifications"
                            className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            onClick={() => setOpen(false)}
                        >
                            View all →
                        </Link>
                    </div>
                </div>
            )}

            {/* Job preview drawer — rendered outside dropdown so z-index stacking works correctly */}
            {previewVacancyId !== null && (
                <VacancyPreviewModal
                    vacancyId={previewVacancyId}
                    onClose={() => setPreviewVacancyId(null)}
                />
            )}
        </div>
    );
}
