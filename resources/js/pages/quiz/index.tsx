import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBestResult {
    score: number;
    passed: boolean;
    level: 'beginner' | 'intermediate' | 'advanced';
    correct_answers: number;
    total_questions: number;
    taken_at: string;
}

interface QuizAssessment {
    id: number;
    title: string;
    description: string | null;
    skill_name: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    time_limit_minutes: number;
    pass_score: number;
    questions_count: number;
    user_best_result: UserBestResult | null;
}

interface Props {
    assessments: QuizAssessment[];
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    backend: 'bg-blue-50 text-blue-700 border-blue-200',
    frontend: 'bg-violet-50 text-violet-700 border-violet-200',
    database: 'bg-amber-50 text-amber-700 border-amber-200',
    general: 'bg-slate-100 text-slate-600 border-slate-200',
};

const DIFFICULTY_COLORS: Record<QuizAssessment['difficulty'], string> = {
    beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
    advanced: 'bg-red-50 text-red-700 border-red-200',
};

const FILTER_PILL_BASE =
    'cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all';
const FILTER_PILL_ACTIVE = 'border-blue-500 bg-blue-500 text-white shadow-sm';
const FILTER_PILL_INACTIVE =
    'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';

// ─── Quiz Card ────────────────────────────────────────────────────────────────

function QuizCard({ quiz }: { quiz: QuizAssessment }) {
    const catColor =
        CATEGORY_COLORS[quiz.category.toLowerCase()] ??
        'bg-slate-100 text-slate-600 border-slate-200';
    const diffColor = DIFFICULTY_COLORS[quiz.difficulty];
    const result = quiz.user_best_result;

    return (
        <div
            className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            onClick={() => router.visit(`/quiz/${quiz.id}`)}
        >
            {/* Card Header */}
            <div className="px-5 pt-5 pb-4">
                <div className="mb-3 flex items-center gap-2">
                    <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${catColor}`}
                    >
                        {quiz.category}
                    </span>
                    <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${diffColor}`}
                    >
                        {quiz.difficulty}
                    </span>
                </div>

                <h3 className="mb-1.5 text-[15px] leading-snug font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {quiz.title}
                </h3>

                {quiz.description && (
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-500">
                        {quiz.description}
                    </p>
                )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
                <span className="flex items-center gap-1">
                    <span>⏱</span>
                    <span>{quiz.time_limit_minutes} min</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                    <span>❓</span>
                    <span>{quiz.questions_count} questions</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                    <span>✅</span>
                    <span>{quiz.pass_score}% to pass</span>
                </span>
            </div>

            {/* Result / Not attempted */}
            <div className="px-5 pb-4">
                {result ? (
                    <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-[12px]">
                            <span className="font-medium text-slate-600">
                                Your best: {result.score}%
                            </span>
                            <span
                                className={`font-bold ${result.passed ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                                {result.passed ? '✓ PASSED' : '✗ FAILED'}
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full transition-all ${result.passed ? 'bg-emerald-500' : 'bg-red-400'}`}
                                style={{ width: `${result.score}%` }}
                            />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                            {result.correct_answers}/{result.total_questions}{' '}
                            correct &middot;{' '}
                            {new Date(result.taken_at).toLocaleDateString()}
                        </p>
                    </div>
                ) : (
                    <p className="mb-3 text-[12px] text-slate-400">
                        Not attempted yet
                    </p>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        router.visit(`/quiz/${quiz.id}`);
                    }}
                    className={`w-full rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${
                        result?.passed
                            ? 'border border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600'
                            : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                    }`}
                >
                    {result?.passed ? 'Retake' : 'Start Quiz →'}
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizIndex({ assessments }: Props) {
    const [activeCategory, setActiveCategory] = useState('all');

    // Derive unique categories from data + the required defaults
    const baseCategories = ['all', 'backend', 'frontend', 'database'];
    const dataCats = assessments.map((a) => a.category.toLowerCase());
    const extraCats = dataCats.filter(
        (c) => !baseCategories.slice(1).includes(c),
    );
    const uniqueExtra = [...new Set(extraCats)];
    const filterCategories = [...baseCategories, ...uniqueExtra];

    const filtered =
        activeCategory === 'all'
            ? assessments
            : assessments.filter(
                  (a) => a.category.toLowerCase() === activeCategory,
              );

    const totalQuizzes = assessments.length;
    const quizzesPassed = assessments.filter(
        (a) => a.user_best_result?.passed === true,
    ).length;
    const skillsEarned = quizzesPassed;

    return (
        <AppLayout>
            <Head title="Skill Quizzes" />

            <div className="min-h-screen bg-slate-50 px-6 py-8">
                <div className="mx-auto max-w-6xl">

                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900">
                            Skill Quizzes
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Earn verified skill badges and improve your AI match
                            scores
                        </p>
                    </div>

                    {/* Stats Bar */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        {[
                            {
                                label: 'Quizzes Available',
                                value: totalQuizzes,
                                icon: '📋',
                                color: 'text-blue-600',
                            },
                            {
                                label: 'Quizzes Passed',
                                value: quizzesPassed,
                                icon: '🏆',
                                color: 'text-emerald-600',
                            },
                            {
                                label: 'Skills Earned',
                                value: skillsEarned,
                                icon: '⭐',
                                color: 'text-amber-600',
                            },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                            >
                                <span className="text-2xl">{stat.icon}</span>
                                <div>
                                    <p
                                        className={`text-2xl font-bold ${stat.color}`}
                                    >
                                        {stat.value}
                                    </p>
                                    <p className="text-[12px] text-slate-500">
                                        {stat.label}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        {filterCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`${FILTER_PILL_BASE} ${
                                    activeCategory === cat
                                        ? FILTER_PILL_ACTIVE
                                        : FILTER_PILL_INACTIVE
                                }`}
                            >
                                {cat === 'all'
                                    ? 'All'
                                    : cat.charAt(0).toUpperCase() +
                                      cat.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Quiz Grid */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center">
                            <span className="mb-3 text-5xl">🎯</span>
                            <p className="text-lg font-semibold text-slate-700">
                                No quizzes available
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Try a different category filter
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((quiz) => (
                                <QuizCard key={quiz.id} quiz={quiz} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
