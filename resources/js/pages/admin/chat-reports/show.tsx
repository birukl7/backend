import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Flag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminSidebarLayout from '@/layouts/admin/admin-sidebar-layout';
import {
    adminChatReportUpdatePath,
    adminChatReportsIndexPath,
    adminSuspiciousUserShowPath,
} from '@/lib/admin-path';
import type { BreadcrumbItem } from '@/types';

interface ReportDetail {
    id: number;
    category: 'scam' | 'insult' | 'other';
    reason: string;
    status: 'pending' | 'reviewed' | 'dismissed';
    admin_notes: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    conversation_id: number;
    vacancy_title: string | null;
    reporter: { id: number; name: string; email: string };
    reported_user: {
        id: number;
        name: string;
        email: string;
        company_name: string | null;
        account_status: string;
    };
    reviewer_name: string | null;
}

interface MessagePreview {
    id: number;
    body: string;
    sender_name: string | null;
    sender_id: number;
    created_at: string | null;
}

interface Props {
    report: ReportDetail;
    recent_messages: MessagePreview[];
    statusOptions: string[];
    accountStatusOptions: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
    scam: 'Scam / fraud',
    insult: 'Insult / harassment',
    other: 'Other',
};

const selectTriggerClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 focus:border-slate-400 focus:ring-1 focus:ring-slate-300';

const selectContentClass =
    'border border-slate-200 bg-white text-slate-900 shadow-lg';

const selectItemClass =
    'cursor-pointer text-slate-900 focus:bg-slate-100 focus:text-slate-900';

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ChatReportShow() {
    const { report, recent_messages, statusOptions, accountStatusOptions } =
        usePage().props as Props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin/dashboard' },
        { title: 'Chat Reports', href: adminChatReportsIndexPath() },
        { title: `Report #${report.id}`, href: adminChatReportUpdatePath(report.id) },
    ];

    const [status, setStatus] = useState(report.status);
    const [adminNotes, setAdminNotes] = useState(report.admin_notes ?? '');
    const [reportedUserStatus, setReportedUserStatus] = useState<string>('');

    const save = () => {
        router.patch(
            adminChatReportUpdatePath(report.id),
            {
                status,
                admin_notes: adminNotes || null,
                reported_user_status: reportedUserStatus || null,
            },
            { preserveScroll: true },
        );
    };

    return (
        <AdminSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={`Chat Report #${report.id}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center gap-3">
                    <Link
                        href={adminChatReportsIndexPath()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-red-500" />
                            <h1 className="text-xl font-bold text-slate-900">
                                Report #{report.id}
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500">
                            Submitted {formatDate(report.created_at)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h2 className="mb-3 text-sm font-semibold text-slate-700">
                                Report details
                            </h2>
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="text-slate-500">Category</dt>
                                    <dd className="font-medium text-slate-900">
                                        {CATEGORY_LABELS[report.category]}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">Reason</dt>
                                    <dd className="whitespace-pre-wrap text-slate-800">
                                        {report.reason}
                                    </dd>
                                </div>
                                {report.vacancy_title && (
                                    <div>
                                        <dt className="text-slate-500">Related job</dt>
                                        <dd className="text-slate-800">{report.vacancy_title}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h2 className="mb-3 text-sm font-semibold text-slate-700">
                                Recent conversation messages
                            </h2>
                            {recent_messages.length === 0 ? (
                                <p className="text-sm text-slate-400">No messages in this conversation.</p>
                            ) : (
                                <div className="max-h-80 space-y-2 overflow-y-auto">
                                    {recent_messages.map((msg) => {
                                        const isReported =
                                            msg.sender_id === report.reported_user.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`rounded-lg border px-3 py-2 text-sm ${
                                                    isReported
                                                        ? 'border-red-200 bg-red-50'
                                                        : 'border-slate-100 bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-medium text-slate-700">
                                                        {msg.sender_name}
                                                        {isReported && (
                                                            <span className="ml-1 text-xs text-red-500">
                                                                (reported)
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {formatDate(msg.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-slate-600">{msg.body}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h2 className="mb-3 text-sm font-semibold text-slate-700">Parties</h2>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-xs text-slate-500">Reporter</p>
                                    <p className="font-medium text-slate-900">{report.reporter.name}</p>
                                    <p className="text-slate-500">{report.reporter.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Reported user</p>
                                    <p className="font-medium text-slate-900">
                                        {report.reported_user.name}
                                        {report.reported_user.company_name && (
                                            <span className="ml-1 text-slate-400">
                                                · {report.reported_user.company_name}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-slate-500">{report.reported_user.email}</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Status: {report.reported_user.account_status}
                                    </p>
                                    <Link
                                        href={adminSuspiciousUserShowPath(report.reported_user.id)}
                                        className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                                    >
                                        Open in suspicious users →
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <h2 className="mb-4 text-sm font-semibold text-slate-700">
                                Admin action
                            </h2>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Report status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className={selectTriggerClass}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className={selectContentClass}>
                                            {statusOptions.map((opt) => (
                                                <SelectItem
                                                    key={opt}
                                                    value={opt}
                                                    className={selectItemClass}
                                                >
                                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="admin-notes">Admin notes</Label>
                                    <textarea
                                        id="admin-notes"
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        rows={4}
                                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="Investigation notes…"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Action on reported user (optional)</Label>
                                    <Select
                                        value={reportedUserStatus || 'none'}
                                        onValueChange={(v) =>
                                            setReportedUserStatus(v === 'none' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger className={selectTriggerClass}>
                                            <SelectValue placeholder="No change" />
                                        </SelectTrigger>
                                        <SelectContent className={selectContentClass}>
                                            <SelectItem value="none" className={selectItemClass}>
                                                No change
                                            </SelectItem>
                                            {accountStatusOptions.map((opt) => (
                                                <SelectItem
                                                    key={opt}
                                                    value={opt}
                                                    className={selectItemClass}
                                                >
                                                    Set account to {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {report.reviewer_name && report.reviewed_at && (
                                    <p className="text-xs text-slate-400">
                                        Last reviewed by {report.reviewer_name} on{' '}
                                        {formatDate(report.reviewed_at)}
                                    </p>
                                )}

                                <Button onClick={save} className="w-full">
                                    Save changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminSidebarLayout>
    );
}
