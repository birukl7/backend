import { Head, usePage } from '@inertiajs/react';
import { DashboardWelcome } from '@/components/dashboard-welcome';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Briefcase, Users, CheckCircle, XCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
    totalJobs: number;
    openJobs: number;
    closedJobs: number;
    totalApplications: number;
}

interface StatusItem {
    status: string;
    count: number;
}

interface JobAppItem {
    title: string;
    count: number;
}

interface TimeItem {
    date: string;
    count: number;
}

interface WorkTypeItem {
    type: string;
    count: number;
}

interface Props {
    stats: Stats;
    statusBreakdown: StatusItem[];
    applicationsPerJob: JobAppItem[];
    applicationsOverTime: TimeItem[];
    workTypeBreakdown: WorkTypeItem[];
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    applied: '#3b82f6',
    shortlisted: '#8b5cf6',
    hired: '#10b981',
    rejected: '#ef4444',
};

const WORK_TYPE_COLORS: Record<string, string> = {
    remote: '#6366f1',
    on_site: '#f59e0b',
    hybrid: '#10b981',
};

const WORK_TYPE_LABELS: Record<string, string> = {
    remote: 'Remote',
    on_site: 'On-site',
    hybrid: 'Hybrid',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    hired: 'Hired',
    rejected: 'Rejected',
};

const BAR_COLOR = '#6366f1';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon: Icon,
    accent,
    sub,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    accent: string;
    sub?: string;
}) {
    return (
        <div className="flex items-center gap-5 rounded-2xl border border-sidebar-border/70 bg-white px-6 py-5 shadow-sm dark:border-sidebar-border dark:bg-sidebar">
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-2xl leading-tight font-bold text-slate-900 dark:text-white">
                    {value}
                </p>
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                    {label}
                </p>
                {sub && (
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function ChartCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-sidebar-border/70 bg-white p-6 shadow-sm dark:border-sidebar-border dark:bg-sidebar">
            <h2 className="mb-5 text-[14px] font-semibold text-slate-700 dark:text-slate-200">
                {title}
            </h2>
            {children}
        </div>
    );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {label && (
                <p className="mb-1 text-slate-500 dark:text-slate-400">
                    {label}
                </p>
            )}
            {payload.map((p: any, i: number) => (
                <p
                    key={i}
                    style={{ color: p.color ?? p.fill }}
                    className="font-semibold"
                >
                    {p.name ? `${p.name}: ` : ''}
                    {p.value}
                </p>
            ))}
        </div>
    );
}

// ─── Custom Pie label ─────────────────────────────────────────────────────────

function PieLabel({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
}: any) {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployerDashboard() {
    const {
        stats,
        statusBreakdown,
        applicationsPerJob,
        applicationsOverTime,
        workTypeBreakdown,
    } = usePage().props as unknown as Props;

    const hasApplications = stats.totalApplications > 0;
    const hasJobs = stats.totalJobs > 0;

    const welcomeMeta =
        stats.totalJobs > 0
            ? `${stats.openJobs} open ${stats.openJobs === 1 ? 'position' : 'positions'} · ${stats.totalApplications} total ${stats.totalApplications === 1 ? 'application' : 'applications'}`
            : 'Post your first job to start receiving applications.';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 overflow-x-auto p-4 md:p-6">
                <DashboardWelcome meta={welcomeMeta} />

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard
                        label="Total Jobs Posted"
                        value={stats.totalJobs}
                        icon={Briefcase}
                        accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                    />
                    <StatCard
                        label="Open Positions"
                        value={stats.openJobs}
                        icon={CheckCircle}
                        accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                        sub={
                            stats.totalJobs
                                ? `${Math.round((stats.openJobs / stats.totalJobs) * 100)}% of total`
                                : undefined
                        }
                    />
                    <StatCard
                        label="Closed Positions"
                        value={stats.closedJobs}
                        icon={XCircle}
                        accent="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    />
                    <StatCard
                        label="Total Applications"
                        value={stats.totalApplications}
                        icon={Users}
                        accent="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                        sub={
                            stats.openJobs
                                ? `~${Math.round(stats.totalApplications / Math.max(stats.openJobs, 1))} per open job`
                                : undefined
                        }
                    />
                </div>

                {/* ── Applications over time ── */}
                <ChartCard title="Applications — Last 30 Days">
                    {hasApplications ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart
                                data={applicationsOverTime}
                                margin={{
                                    top: 4,
                                    right: 4,
                                    left: -20,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="areaGrad"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#6366f1"
                                            stopOpacity={0.25}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#6366f1"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={4}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    name="Applications"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#areaGrad)"
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#6366f1' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState label="No applications received yet." />
                    )}
                </ChartCard>

                {/* ── Bottom row ── */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Applications per job */}
                    <div className="md:col-span-2">
                        <ChartCard title="Applications per Job (Top 6)">
                            {hasJobs ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        data={applicationsPerJob}
                                        layout="vertical"
                                        margin={{
                                            top: 0,
                                            right: 16,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#e2e8f0"
                                            horizontal={false}
                                        />
                                        <XAxis
                                            type="number"
                                            allowDecimals={false}
                                            tick={{
                                                fontSize: 10,
                                                fill: '#94a3b8',
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="title"
                                            width={110}
                                            tick={{
                                                fontSize: 11,
                                                fill: '#64748b',
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            content={<CustomTooltip />}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar
                                            dataKey="count"
                                            name="Applications"
                                            fill={BAR_COLOR}
                                            radius={[0, 6, 6, 0]}
                                            maxBarSize={18}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState label="No jobs posted yet." />
                            )}
                        </ChartCard>
                    </div>

                    {/* Application status pie */}
                    <ChartCard title="Application Status">
                        {hasApplications ? (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={statusBreakdown}
                                            dataKey="count"
                                            nameKey="status"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={48}
                                            outerRadius={78}
                                            paddingAngle={2}
                                            labelLine={false}
                                            label={PieLabel}
                                        >
                                            {statusBreakdown.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={
                                                        STATUS_COLORS[
                                                            entry.status
                                                        ] ?? '#cbd5e1'
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length)
                                                    return null;
                                                const d = payload[0]
                                                    .payload as StatusItem;
                                                return (
                                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                                        <p
                                                            style={{
                                                                color: STATUS_COLORS[
                                                                    d.status
                                                                ],
                                                            }}
                                                            className="font-semibold"
                                                        >
                                                            {STATUS_LABELS[
                                                                d.status
                                                            ] ?? d.status}
                                                        </p>
                                                        <p className="text-slate-500">
                                                            {d.count}{' '}
                                                            application
                                                            {d.count !== 1
                                                                ? 's'
                                                                : ''}
                                                        </p>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Legend */}
                                <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
                                    {statusBreakdown.map((s) => (
                                        <span
                                            key={s.status}
                                            className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"
                                        >
                                            <span
                                                className="h-2 w-2 shrink-0 rounded-full"
                                                style={{
                                                    background:
                                                        STATUS_COLORS[
                                                            s.status
                                                        ] ?? '#cbd5e1',
                                                }}
                                            />
                                            {STATUS_LABELS[s.status] ??
                                                s.status}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <EmptyState label="No applications yet." />
                        )}
                    </ChartCard>
                </div>

                {/* ── Work type breakdown ── */}
                {workTypeBreakdown.length > 0 && (
                    <ChartCard title="Open Jobs by Work Type">
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart
                                data={workTypeBreakdown}
                                margin={{
                                    top: 4,
                                    right: 4,
                                    left: -20,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="type"
                                    tickFormatter={(v: string) =>
                                        WORK_TYPE_LABELS[v] ?? v
                                    }
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length)
                                            return null;
                                        const key = (label as string) ?? '';
                                        return (
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                                <p className="mb-0.5 text-slate-500">
                                                    {WORK_TYPE_LABELS[key] ??
                                                        key}
                                                </p>
                                                <p
                                                    style={{
                                                        color:
                                                            WORK_TYPE_COLORS[
                                                                key
                                                            ] ?? '#6366f1',
                                                    }}
                                                    className="font-semibold"
                                                >
                                                    {payload[0].value} job
                                                    {(payload[0]
                                                        .value as number) !== 1
                                                        ? 's'
                                                        : ''}
                                                </p>
                                            </div>
                                        );
                                    }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Bar
                                    dataKey="count"
                                    name="Jobs"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={48}
                                >
                                    {workTypeBreakdown.map((entry, i) => (
                                        <Cell
                                            key={i}
                                            fill={
                                                WORK_TYPE_COLORS[entry.type] ??
                                                '#6366f1'
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}
            </div>
        </AppLayout>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex h-[180px] items-center justify-center text-[13px] text-slate-400 dark:text-slate-500">
            {label}
        </div>
    );
}
