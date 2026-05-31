import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import type { Auth } from '@/types';

interface PublicStats {
    total_hires: number;
    total_applications: number;
    active_jobs: number;
    employers_hiring: number;
    hires_last_30_days: number;
    success_rate: number;
}

interface TopEmployer {
    employer_id: number;
    employer_name: string | null;
    hires: number;
}

interface HirePoint {
    month: string;
    hires: number;
}

interface Props {
    stats: PublicStats;
    topEmployers: TopEmployer[];
    hiresOverTime: HirePoint[];
}

function PublicHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2">
                    <AppLogo />
                </Link>
                <nav className="flex items-center gap-2">
                    <Link
                        href="/jobs"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        Browse jobs
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                        Sign up
                    </Link>
                </nav>
            </div>
        </header>
    );
}

function StatCard({
    label,
    value,
    accent,
}: {
    label: string;
    value: string | number;
    accent: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className={`text-3xl font-bold ${accent}`}>{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
        </div>
    );
}

function StatsContent({ stats, topEmployers, hiresOverTime }: Props) {
    const maxHires = Math.max(1, ...hiresOverTime.map((p) => p.hires));
    const topMax = Math.max(1, ...topEmployers.map((e) => e.hires));

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Hiring statistics
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Real hiring activity across the platform.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard
                    label="Total hires"
                    value={stats.total_hires}
                    accent="text-emerald-600"
                />
                <StatCard
                    label="Employers hiring"
                    value={stats.employers_hiring}
                    accent="text-blue-600"
                />
                <StatCard
                    label="Active jobs"
                    value={stats.active_jobs}
                    accent="text-violet-600"
                />
                <StatCard
                    label="Applications"
                    value={stats.total_applications}
                    accent="text-slate-800"
                />
                <StatCard
                    label="Hired (last 30 days)"
                    value={stats.hires_last_30_days}
                    accent="text-amber-600"
                />
                <StatCard
                    label="Success rate"
                    value={`${stats.success_rate}%`}
                    accent="text-rose-600"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Hires over time */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="mb-4 text-sm font-bold text-slate-800">
                        Hires over the last 6 months
                    </h2>
                    <div className="flex h-48 items-end gap-3">
                        {hiresOverTime.map((p) => (
                            <div
                                key={p.month}
                                className="flex flex-1 flex-col items-center gap-2"
                            >
                                <div className="flex w-full flex-1 items-end">
                                    <div
                                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all"
                                        style={{
                                            height: `${(p.hires / maxHires) * 100}%`,
                                            minHeight: p.hires > 0 ? '6px' : '0',
                                        }}
                                        title={`${p.hires} hires`}
                                    />
                                </div>
                                <span className="text-[11px] font-medium text-slate-400">
                                    {p.month}
                                </span>
                                <span className="text-[11px] font-bold text-slate-600">
                                    {p.hires}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top hiring employers */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="mb-4 text-sm font-bold text-slate-800">
                        Top hiring employers
                    </h2>
                    {topEmployers.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">
                            No hires recorded yet.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {topEmployers.map((e, i) => (
                                <div
                                    key={e.employer_id}
                                    className="flex items-center gap-3"
                                >
                                    <span className="w-5 shrink-0 text-[13px] font-bold text-slate-400">
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center justify-between">
                                            <p className="truncate text-[13px] font-semibold text-slate-700">
                                                {e.employer_name ?? 'Employer'}
                                            </p>
                                            <span className="shrink-0 text-[12px] font-bold text-emerald-600">
                                                {e.hires}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-emerald-500"
                                                style={{
                                                    width: `${(e.hires / topMax) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function HiringStatistics(props: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;

    if (auth.user) {
        return (
            <AppLayout>
                <Head title="Hiring Statistics" />
                <StatsContent {...props} />
            </AppLayout>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Head title="Hiring Statistics" />
            <PublicHeader />
            <main className="mx-auto max-w-7xl">
                <StatsContent {...props} />
            </main>
        </div>
    );
}
