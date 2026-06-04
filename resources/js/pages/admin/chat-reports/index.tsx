import { Head, Link, router, usePage } from '@inertiajs/react';
import { Flag, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminSidebarLayout from '@/layouts/admin/admin-sidebar-layout';
import {
    adminChatReportShowPath,
    adminChatReportsIndexPath,
} from '@/lib/admin-path';
import type { BreadcrumbItem } from '@/types';

interface ReportRow {
    id: number;
    category: 'scam' | 'insult' | 'other';
    reason: string;
    status: 'pending' | 'reviewed' | 'dismissed';
    created_at: string | null;
    reporter: { id: number; name: string; email: string };
    reported_user: {
        id: number;
        name: string;
        email: string;
        account_status: string;
    };
    reviewer_name: string | null;
    reviewed_at: string | null;
}

interface PaginatedReports {
    data: ReportRow[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    last_page: number;
}

interface Props {
    reports: PaginatedReports;
    filters: { status: string; category: string };
    statusOptions: string[];
    categoryOptions: string[];
    stats: { pending: number; reviewed: number; dismissed: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'Chat Reports', href: '/admin/chat-reports' },
];

const CATEGORY_LABELS: Record<string, string> = {
    scam: 'Scam / fraud',
    insult: 'Insult / harassment',
    other: 'Other',
};

const STATUS_CFG: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    reviewed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dismissed: 'bg-slate-50 text-slate-600 border-slate-200',
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

export default function ChatReportsIndex() {
    const { reports, filters, statusOptions, categoryOptions, stats } =
        usePage().props as Props;
    const [status, setStatus] = useState(filters.status || 'pending');
    const [category, setCategory] = useState(filters.category || '');

    const applyFilters = (e?: FormEvent) => {
        e?.preventDefault();
        router.get(
            adminChatReportsIndexPath(),
            { status, category: category || undefined },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AdminSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat Reports" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-red-500" />
                        <h1 className="text-xl font-bold text-slate-900">Chat Reports</h1>
                    </div>
                    <p className="text-sm text-slate-500">
                        Review scam and harassment reports from employers and job seekers.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                        <p className="text-sm text-amber-600">Pending</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-2xl font-bold text-emerald-700">{stats.reviewed}</p>
                        <p className="text-sm text-emerald-600">Reviewed</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-2xl font-bold text-slate-700">{stats.dismissed}</p>
                        <p className="text-sm text-slate-500">Dismissed</p>
                    </div>
                </div>

                <form
                    onSubmit={applyFilters}
                    className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                    <div className="w-44">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                            Status
                        </label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className={selectTriggerClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                {statusOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt} className={selectItemClass}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-44">
                        <label className="mb-1 block text-xs font-medium text-slate-500">
                            Category
                        </label>
                        <Select
                            value={category || 'all'}
                            onValueChange={(v) => setCategory(v === 'all' ? '' : v)}
                        >
                            <SelectTrigger className={selectTriggerClass}>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                <SelectItem value="all" className={selectItemClass}>
                                    All categories
                                </SelectItem>
                                {categoryOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt} className={selectItemClass}>
                                        {CATEGORY_LABELS[opt] ?? opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="gap-2">
                        <Search className="h-4 w-4" />
                        Filter
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {reports.data.length === 0 ? (
                        <div className="px-6 py-16 text-center text-sm text-slate-400">
                            No reports match your filters.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {reports.data.map((report) => (
                                <Link
                                    key={report.id}
                                    href={adminChatReportShowPath(report.id)}
                                    className="block px-5 py-4 transition-colors hover:bg-slate-50"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-slate-900">
                                                    {report.reported_user.name}
                                                </span>
                                                <span className="text-xs text-slate-400">reported by</span>
                                                <span className="text-sm text-slate-600">
                                                    {report.reporter.name}
                                                </span>
                                                <span
                                                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CFG[report.status]}`}
                                                >
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {CATEGORY_LABELS[report.category]} ·{' '}
                                                {formatDate(report.created_at)}
                                            </p>
                                            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                                                {report.reason}
                                            </p>
                                        </div>
                                        <span className="text-xs text-blue-600">Review →</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminSidebarLayout>
    );
}
