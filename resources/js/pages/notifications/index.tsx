import { Head, router } from '@inertiajs/react';
import { Bell, Calendar, CheckCircle, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { VacancyPreviewModal } from '@/components/vacancy-preview-modal';
import { useState } from 'react';

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

interface PaginatedNotifications {
    data: AppNotification[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    notifications: PaginatedNotifications;
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

function NotificationIcon({ type }: { type: string }) {
    switch (type) {
        case 'job_invitation':
            return (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Bell className="h-4 w-4 text-blue-500" />
                </div>
            );
        case 'application_status':
            return (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
            );
        case 'interview_scheduled':
            return (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Calendar className="h-4 w-4 text-violet-500" />
                </div>
            );
        default:
            return (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <Bell className="h-4 w-4 text-slate-400" />
                </div>
            );
    }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NotificationsIndex({ notifications }: Props) {
    const breadcrumbs = [{ title: 'Notifications', href: '/notifications' }];
    const [previewVacancyId, setPreviewVacancyId] = useState<number | null>(
        null,
    );

    function handleMarkAllRead() {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    }

    function handleNotificationClick(notification: AppNotification) {
        // Mark as read if not already
        if (!notification.read_at) {
            router.patch(
                `/notifications/${notification.id}/read`,
                {},
                { preserveScroll: true },
            );
        }

        // If it's a job notification, open the preview drawer instead of navigating away
        const vid = notification.data?.vacancy_id;
        if (vid) {
            setPreviewVacancyId(Number(vid));
        }
    }

    function handleDelete(id: number) {
        router.delete(`/notifications/${id}`, { preserveScroll: true });
    }

    function handlePageChange(page: number) {
        router.visit(`/notifications?page=${page}`, { preserveScroll: false });
    }

    const hasUnread = notifications.data.some((n) => n.read_at === null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />

            <div className="mx-auto max-w-3xl px-4 py-8">
                {/* Page header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Notifications
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-400">
                            {notifications.total > 0
                                ? `${notifications.total} notification${notifications.total === 1 ? '' : 's'} total`
                                : 'Nothing here yet'}
                        </p>
                    </div>
                    {hasUnread && (
                        <button
                            onClick={handleMarkAllRead}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                            Mark all read
                        </button>
                    )}
                </div>

                {/* Notification list */}
                {notifications.data.length === 0 ? (
                    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                            <Bell className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="font-semibold text-slate-600">
                            You have no notifications yet.
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            We'll let you know when something important happens.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.data.map((n) => {
                            const isUnread = n.read_at === null;
                            const isJobNotification = !!n.data?.vacancy_id;

                            return (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm ${
                                        isUnread
                                            ? 'border-l-4 border-blue-200 border-l-blue-400 bg-blue-50/50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    {/* Icon */}
                                    <NotificationIcon type={n.type} />

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p
                                                className={`text-[14px] leading-snug font-semibold ${
                                                    isUnread
                                                        ? 'text-slate-900'
                                                        : 'text-slate-700'
                                                }`}
                                            >
                                                {n.title}
                                            </p>
                                            {isUnread && (
                                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                                            {n.body}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <p className="text-[11px] text-slate-400">
                                                {timeAgo(n.created_at)}
                                            </p>
                                            {isJobNotification && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-500">
                                                    <svg
                                                        className="h-3 w-3"
                                                        viewBox="0 0 16 16"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M6.22 3.22a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06-1.06L9.44 7.5 6.22 4.28a.75.75 0 010-1.06z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    View Job
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(n.id);
                                        }}
                                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
                                        aria-label="Delete notification"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {notifications.last_page > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                            onClick={() =>
                                handlePageChange(notifications.current_page - 1)
                            }
                            disabled={notifications.current_page === 1}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            ← Previous
                        </button>

                        <span className="text-sm text-slate-500">
                            Page {notifications.current_page} of{' '}
                            {notifications.last_page}
                        </span>

                        <button
                            onClick={() =>
                                handlePageChange(notifications.current_page + 1)
                            }
                            disabled={
                                notifications.current_page ===
                                notifications.last_page
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
            {/* Job preview drawer */}
            {previewVacancyId !== null && (
                <VacancyPreviewModal
                    vacancyId={previewVacancyId}
                    onClose={() => setPreviewVacancyId(null)}
                />
            )}
        </AppLayout>
    );
}
