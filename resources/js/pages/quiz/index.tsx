import { Head, router, useForm, usePage } from '@inertiajs/react';
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
    ai_quiz: QuizAssessment | null;
    has_cv_skills: boolean;
    llm_configured: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    backend: 'bg-blue-50 text-blue-700 border-blue-200',
    frontend: 'bg-violet-50 text-violet-700 border-violet-200',
    database: 'bg-amber-50 text-amber-700 border-amber-200',
    general: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ─── AI Quiz Section ─────────────────────────────────────────────────────────

function AiQuizSection({
    aiQuiz,
    hasCvSkills,
    llmConfigured,
}: {
    aiQuiz: QuizAssessment | null;
    hasCvSkills: boolean;
    llmConfigured: boolean;
}) {
    const { post, processing } = useForm({});
    const flash = (usePage().props as Record<string, unknown>).flash as
        | Record<string, string>
        | undefined;
    const errors = (usePage().props as Record<string, unknown>).errors as
        | Record<string, string>
        | undefined;

    function handleGenerate() {
        post('/quiz/generate');
    }

    if (!hasCvSkills) {
        return (
            <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
                <div className="flex items-center gap-5 px-6 py-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-2xl">
                        🤖
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-violet-900">
                            Get a Personalized AI Quiz
                        </p>
                        <p className="mt-0.5 text-[13px] text-violet-600">
                            Add skills to your CV and the AI will generate a
                            custom 10-question quiz based on your expertise.
                        </p>
                    </div>
                    <a
                        href="/cv"
                        className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-violet-700"
                    >
                        Add CV Skills →
                    </a>
                </div>
            </div>
        );
    }

    if (!llmConfigured) {
        return (
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                <div className="flex items-center gap-4 px-6 py-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-[13px] font-semibold text-amber-800">
                            AI Quiz Generation Not Configured
                        </p>
                        <p className="text-[12px] text-amber-700">
                            Add{' '}
                            <code className="rounded bg-amber-100 px-1 font-mono">
                                GROQ_API_KEY
                            </code>{' '}
                            to your{' '}
                            <code className="rounded bg-amber-100 px-1 font-mono">
                                .env
                            </code>{' '}
                            file. Get a free key at{' '}
                            <a
                                href="https://console.groq.com"
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-amber-900"
                            >
                                console.groq.com
                            </a>
                            .
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (aiQuiz) {
        const result = aiQuiz.user_best_result;
        const catColor =
            CATEGORY_COLORS[aiQuiz.category.toLowerCase()] ??
            'bg-slate-100 text-slate-600 border-slate-200';

        return (
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        <h2 className="text-[15px] font-bold text-slate-900">
                            Your AI-Personalized Quiz
                        </h2>
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600">
                            Generated for you
                        </span>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={processing}
                        className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-[12px] font-medium text-violet-600 transition-colors hover:bg-violet-50 disabled:opacity-50"
                    >
                        {processing ? (
                            <svg
                                className="h-3.5 w-3.5 animate-spin"
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
                        ) : (
                            <svg
                                className="h-3.5 w-3.5"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path d="M13.836 2.477a.75.75 0 01.75.75v3.182a.75.75 0 01-.75.75h-3.182a.75.75 0 110-1.5h1.37L10.5 4.125a4.5 4.5 0 103.836 2.914.75.75 0 011.455-.364A6 6 0 1112.5 2.656l.836.836V3.227a.75.75 0 01.5-.75z" />
                            </svg>
                        )}
                        Regenerate
                    </button>
                </div>

                <div
                    onClick={() => router.visit(`/quiz/${aiQuiz.id}`)}
                    className="cursor-pointer overflow-hidden rounded-2xl border-2 border-violet-200 bg-white shadow-sm transition-all hover:border-violet-400 hover:shadow-md"
                >
                    <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />

                    <div className="px-5 pt-5 pb-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${catColor}`}
                            >
                                {aiQuiz.category}
                            </span>
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600">
                                ✨ AI Generated
                            </span>
                        </div>

                        <h3 className="mb-1 text-[16px] font-bold text-slate-900">
                            {aiQuiz.title}
                        </h3>
                        {aiQuiz.description && (
                            <p className="text-[13px] leading-relaxed text-slate-500">
                                {aiQuiz.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
                        <span>⏱ {aiQuiz.time_limit_minutes} min</span>
                        <span className="text-slate-300">•</span>
                        <span>❓ {aiQuiz.questions_count} questions</span>
                        <span className="text-slate-300">•</span>
                        <span>✅ {aiQuiz.pass_score}% to pass</span>
                    </div>

                    <div className="px-5 pb-4">
                        {result ? (
                            <div className="mb-3">
                                <div className="mb-1 flex items-center justify-between text-[12px]">
                                    <span className="font-medium text-slate-600">
                                        Best: {result.score}%
                                    </span>
                                    <span
                                        className={`font-bold ${result.passed ? 'text-emerald-600' : 'text-red-500'}`}
                                    >
                                        {result.passed
                                            ? '✓ PASSED'
                                            : '✗ FAILED'}
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full ${result.passed ? 'bg-emerald-500' : 'bg-red-400'}`}
                                        style={{ width: `${result.score}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="mb-3 text-[12px] text-slate-400">
                                Not attempted yet
                            </p>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                router.visit(`/quiz/${aiQuiz.id}`);
                            }}
                            className={`w-full rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${
                                result?.passed
                                    ? 'border border-violet-300 bg-white text-violet-700 hover:bg-violet-50'
                                    : 'bg-violet-600 text-white hover:bg-violet-700'
                            }`}
                        >
                            {result?.passed ? 'Retake' : 'Start My Quiz →'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
            {flash?.success && (
                <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3">
                    <p className="text-[13px] font-semibold text-emerald-700">
                        ✓ {flash.success}
                    </p>
                </div>
            )}
            {errors?.generate && (
                <div className="border-b border-red-200 bg-red-50 px-6 py-3">
                    <p className="text-[13px] text-red-700">
                        {errors.generate}
                    </p>
                </div>
            )}

            <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-3xl">
                    🤖
                </div>
                <h2 className="mb-1 text-[16px] font-bold text-violet-900">
                    Get Your Personalized AI Quiz
                </h2>
                <p className="mb-6 max-w-md text-[13px] leading-relaxed text-violet-600">
                    The AI will analyze your CV skills and generate a tailored
                    10-question assessment specifically for your role and
                    expertise level.
                </p>

                {processing ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-3 shadow-sm">
                            <svg
                                className="h-5 w-5 animate-spin text-violet-600"
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
                            <span className="text-[13px] font-semibold text-violet-700">
                                Generating your quiz…
                            </span>
                        </div>
                        <p className="text-[11px] text-violet-500">
                            The AI is crafting questions based on your skills.
                            This takes ~10 seconds.
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={handleGenerate}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
                    >
                        <span>✨</span>
                        Generate My Quiz
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizIndex({
    ai_quiz,
    has_cv_skills,
    llm_configured,
}: Props) {
    const passed = ai_quiz?.user_best_result?.passed === true;

    return (
        <AppLayout>
            <Head title="Skill Quizzes" />

            <div className="min-h-screen bg-slate-50 px-6 py-8">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900">
                            Skill Quizzes
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            AI-generated assessments based on your CV skills —
                            earn verified badges and improve your match scores
                        </p>
                    </div>

                    {ai_quiz && (
                        <div className="mb-6 grid grid-cols-3 gap-3">
                            {[
                                {
                                    label: 'Quiz Status',
                                    value: passed ? 'Passed' : 'Ready',
                                    icon: '📋',
                                    color: passed
                                        ? 'text-emerald-600'
                                        : 'text-blue-600',
                                },
                                {
                                    label: 'Best Score',
                                    value: ai_quiz.user_best_result
                                        ? `${ai_quiz.user_best_result.score}%`
                                        : '—',
                                    icon: '🏆',
                                    color: 'text-emerald-600',
                                },
                                {
                                    label: 'Questions',
                                    value: ai_quiz.questions_count,
                                    icon: '❓',
                                    color: 'text-amber-600',
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                                >
                                    <span className="text-2xl">
                                        {stat.icon}
                                    </span>
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
                    )}

                    <AiQuizSection
                        aiQuiz={ai_quiz}
                        hasCvSkills={has_cv_skills}
                        llmConfigured={llm_configured}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
