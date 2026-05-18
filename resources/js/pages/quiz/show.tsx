import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Assessment {
    id: number;
    title: string;
    description: string | null;
    skill_name: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    time_limit_minutes: number;
    pass_score: number;
}

interface QuizOption {
    id: number;
    option_text: string;
}

interface Question {
    id: number;
    question: string;
    options: QuizOption[];
}

interface PreviousResult {
    score: number;
    passed: boolean;
    level: 'beginner' | 'intermediate' | 'advanced';
    correct_answers: number;
    total_questions: number;
    taken_at: string;
}

interface AnswerDetail {
    question_id: number;
    question: string;
    correct_option_id: number;
    user_option_id: number | null;
    is_correct: boolean;
    explanation: string | null;
    options: Array<{ id: number; option_text: string; is_correct: boolean }>;
}

interface QuizResult {
    score: number;
    passed: boolean;
    level: 'beginner' | 'intermediate' | 'advanced';
    correct_answers: number;
    total_questions: number;
    skill_added: boolean;
    skill_name: string;
    answers_detail: AnswerDetail[];
}

interface Props {
    assessment: Assessment;
    questions: Question[];
    previous_result: PreviousResult | null;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    backend: 'bg-blue-50   text-blue-700   border-blue-200',
    frontend: 'bg-violet-50 text-violet-700 border-violet-200',
    database: 'bg-amber-50  text-amber-700  border-amber-200',
};
const catColor = (cat: string) =>
    CATEGORY_COLORS[cat.toLowerCase()] ??
    'bg-slate-100 text-slate-600 border-slate-200';

const DIFFICULTY_COLORS: Record<Assessment['difficulty'], string> = {
    beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    intermediate: 'bg-amber-50   text-amber-700   border-amber-200',
    advanced: 'bg-red-50     text-red-700     border-red-200',
};

const DIFFICULTY_SCORE_RING: Record<Assessment['difficulty'], string> = {
    beginner: 'text-emerald-600',
    intermediate: 'text-amber-500',
    advanced: 'text-red-500',
};

// ─── Utility: format seconds → MM:SS ─────────────────────────────────────────

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Score Circle (SVG) ───────────────────────────────────────────────────────

function ScoreCircle({ score, passed }: { score: number; passed: boolean }) {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const strokeColor = passed ? '#10b981' : '#ef4444'; // emerald-500 / red-500

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: 140, height: 140 }}
        >
            <svg width="140" height="140" className="-rotate-90">
                {/* track */}
                <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                />
                {/* progress */}
                <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span
                    className="text-4xl leading-none font-extrabold"
                    style={{ color: strokeColor }}
                >
                    {score}%
                </span>
                <span className="mt-0.5 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                    score
                </span>
            </div>
        </div>
    );
}

// ─── Answer Review Item ───────────────────────────────────────────────────────

function ReviewItem({
    detail,
    index,
}: {
    detail: AnswerDetail;
    index: number;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Header row */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                            detail.is_correct ? 'bg-emerald-500' : 'bg-red-400'
                        }`}
                    >
                        {detail.is_correct ? '✓' : '✗'}
                    </span>
                    <span className="line-clamp-1 text-[13px] font-medium text-slate-800">
                        Q{index + 1}. {detail.question}
                    </span>
                </div>
                <span className="shrink-0 text-sm text-slate-400">
                    {open ? '▲' : '▼'}
                </span>
            </button>

            {/* Expanded body */}
            {open && (
                <div className="space-y-2 border-t border-slate-100 px-5 pt-4 pb-5">
                    {detail.options.map((opt) => {
                        const isUser = opt.id === detail.user_option_id;
                        const isCorrect = opt.id === detail.correct_option_id;

                        let cls = 'rounded-xl border-2 px-4 py-3 text-[13px] ';
                        if (isCorrect) {
                            cls +=
                                'border-emerald-400 bg-emerald-50 text-emerald-900';
                        } else if (isUser && !isCorrect) {
                            cls += 'border-red-300 bg-red-50 text-red-900';
                        } else {
                            cls +=
                                'border-slate-200 bg-slate-50 text-slate-600';
                        }

                        return (
                            <div key={opt.id} className={cls}>
                                <span className="font-medium">
                                    {opt.option_text}
                                </span>
                                <span className="ml-2 text-[11px] font-semibold">
                                    {isCorrect && '✓ Correct'}
                                    {isUser && !isCorrect && '✗ Your answer'}
                                </span>
                            </div>
                        );
                    })}

                    {detail.user_option_id === null && (
                        <p className="text-[12px] text-slate-400 italic">
                            You did not answer this question.
                        </p>
                    )}

                    {detail.explanation && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="mb-0.5 text-[12px] font-semibold text-amber-700">
                                💡 Explanation
                            </p>
                            <p className="text-[13px] leading-relaxed text-amber-800">
                                {detail.explanation}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizShow({
    assessment,
    questions,
    previous_result,
}: Props) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [phase, setPhase] = useState<'intro' | 'quiz' | 'results'>('intro');
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number | null>>({});
    const [timeLeft, setTimeLeft] = useState(
        assessment.time_limit_minutes * 60,
    );
    const [timerActive, setTimerActive] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);

    // Ref so submitQuiz always has the latest answers / timeLeft
    const answersRef = useRef(answers);
    const timeLeftRef = useRef(timeLeft);
    answersRef.current = answers;
    timeLeftRef.current = timeLeft;

    const submittingRef = useRef(submitting);
    submittingRef.current = submitting;

    // ── Timer ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!timerActive) return;

        const id = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(id);
                    // fire submit on next tick so state is flushed
                    setTimeout(() => submitQuiz(), 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerActive]);

    // ── Submission ─────────────────────────────────────────────────────────────
    async function submitQuiz() {
        if (submittingRef.current) return;
        setSubmitting(true);
        setTimerActive(false);

        const timeTaken =
            assessment.time_limit_minutes * 60 - timeLeftRef.current;

        const csrfToken =
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement
            )?.content ?? '';

        try {
            const res = await fetch(`/quiz/${assessment.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    answers: answersRef.current,
                    time_taken_seconds: timeTaken,
                }),
            });
            const data: QuizResult = await res.json();
            setResult(data);
            setPhase('results');
        } finally {
            setSubmitting(false);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    function startQuiz() {
        setCurrentQ(0);
        setAnswers({});
        setTimeLeft(assessment.time_limit_minutes * 60);
        setTimerActive(true);
        setPhase('quiz');
    }

    function retake() {
        setResult(null);
        setReviewOpen(false);
        startQuiz();
    }

    const answeredCount = Object.keys(answers).length;
    const progress =
        questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    const currentQuestion = questions[currentQ];

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1 — Intro
    // ─────────────────────────────────────────────────────────────────────────
    const IntroPhase = (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-2xl">
                {/* Back */}
                <button
                    onClick={() => router.visit('/quiz')}
                    className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                    <span>←</span> Back to Quizzes
                </button>

                {/* Hero card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* Top colour strip based on difficulty */}
                    <div
                        className={`h-1.5 w-full ${
                            assessment.difficulty === 'beginner'
                                ? 'bg-emerald-400'
                                : assessment.difficulty === 'intermediate'
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                        }`}
                    />

                    <div className="px-8 pt-8 pb-6">
                        {/* Badges */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${catColor(assessment.category)}`}
                            >
                                {assessment.category}
                            </span>
                            <span
                                className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold capitalize ${DIFFICULTY_COLORS[assessment.difficulty]}`}
                            >
                                {assessment.difficulty}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="mb-2 text-2xl leading-tight font-extrabold text-slate-900">
                            {assessment.title}
                        </h1>

                        {/* Description */}
                        {assessment.description && (
                            <p className="mb-6 text-[14px] leading-relaxed text-slate-500">
                                {assessment.description}
                            </p>
                        )}

                        {/* Key info grid */}
                        <div className="mb-6 grid grid-cols-3 gap-3">
                            {[
                                {
                                    icon: '⏱',
                                    label: 'Time Limit',
                                    value: `${assessment.time_limit_minutes} min`,
                                },
                                {
                                    icon: '❓',
                                    label: 'Questions',
                                    value: `${questions.length}`,
                                },
                                {
                                    icon: '✅',
                                    label: 'Pass Score',
                                    value: `${assessment.pass_score}%`,
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-center"
                                >
                                    <span className="mb-1 text-2xl">
                                        {item.icon}
                                    </span>
                                    <span className="text-[15px] font-bold text-slate-800">
                                        {item.value}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Previous result */}
                        {previous_result && (
                            <div
                                className={`mb-6 rounded-xl border px-5 py-4 ${
                                    previous_result.passed
                                        ? 'border-emerald-200 bg-emerald-50'
                                        : 'border-red-200 bg-red-50'
                                }`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <p
                                        className={`text-[13px] font-semibold ${
                                            previous_result.passed
                                                ? 'text-emerald-700'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {previous_result.passed
                                            ? '🏆 Previous attempt: PASSED'
                                            : '❌ Previous attempt: FAILED'}
                                    </p>
                                    <span
                                        className={`text-[13px] font-bold ${
                                            previous_result.passed
                                                ? 'text-emerald-700'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {previous_result.score}%
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/60">
                                    <div
                                        className={`h-full rounded-full ${
                                            previous_result.passed
                                                ? 'bg-emerald-500'
                                                : 'bg-red-400'
                                        }`}
                                        style={{
                                            width: `${previous_result.score}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-500">
                                    {previous_result.correct_answers}/
                                    {previous_result.total_questions} correct
                                    &middot;{' '}
                                    {new Date(
                                        previous_result.taken_at,
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={startQuiz}
                            className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                        >
                            Start Quiz →
                        </button>
                    </div>
                </div>

                {/* Tip */}
                <p className="mt-4 text-center text-[12px] text-slate-400">
                    You can skip questions and come back. Unanswered questions
                    count as incorrect.
                </p>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2 — Quiz
    // ─────────────────────────────────────────────────────────────────────────
    const QuizPhase = currentQuestion ? (
        <div className="flex min-h-screen flex-col bg-slate-50">
            {/* ── Sticky top bar ──────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm">
                {/* Info row */}
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
                    {/* Title */}
                    <span className="max-w-[45%] truncate text-[13px] font-semibold text-slate-700">
                        {assessment.title}
                    </span>

                    {/* Progress label */}
                    <span className="text-[12px] font-medium text-slate-500">
                        Q {currentQ + 1} of {questions.length}
                    </span>

                    {/* Timer */}
                    <span
                        className={`font-mono text-[14px] font-bold tabular-nums ${
                            timeLeft < 60
                                ? 'animate-pulse text-red-500'
                                : 'text-slate-600'
                        }`}
                    >
                        ⏱ {formatTime(timeLeft)}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 w-full bg-slate-100">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* ── Question card ───────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col items-center px-4 py-8">
                <div className="w-full max-w-3xl">
                    {/* Question header */}
                    <div className="mb-5">
                        <p className="mb-1 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                            Question {currentQ + 1}
                        </p>
                        <p className="text-[18px] leading-snug font-bold text-slate-900">
                            {currentQuestion.question}
                        </p>
                    </div>

                    {/* Option cards */}
                    <div className="mb-8 space-y-3">
                        {currentQuestion.options.map((opt) => {
                            const selected =
                                answers[currentQuestion.id] === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() =>
                                        setAnswers((prev) => ({
                                            ...prev,
                                            [currentQuestion.id]: opt.id,
                                        }))
                                    }
                                    className={`w-full rounded-2xl border-2 px-5 py-4 text-left text-[14px] font-medium transition-all ${
                                        selected
                                            ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-3">
                                        {/* Radio dot */}
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                                selected
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-slate-300 bg-white'
                                            }`}
                                        >
                                            {selected && (
                                                <span className="h-2 w-2 rounded-full bg-white" />
                                            )}
                                        </span>
                                        {opt.option_text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Navigation footer ──────────────────────────────── */}
                    <div className="flex items-center gap-4">
                        {/* Previous */}
                        <button
                            onClick={() =>
                                setCurrentQ((q) => Math.max(0, q - 1))
                            }
                            disabled={currentQ === 0}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
                        >
                            ← Previous
                        </button>

                        {/* Dot indicators */}
                        <div className="flex flex-1 flex-wrap justify-center gap-1.5">
                            {questions.map((q, i) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQ(i)}
                                    title={`Question ${i + 1}`}
                                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                                        i === currentQ
                                            ? 'scale-125 bg-blue-500'
                                            : answers[q.id] !== undefined
                                              ? 'bg-blue-300'
                                              : 'bg-slate-300'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Next / Submit */}
                        {currentQ < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentQ((q) => q + 1)}
                                className="rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={submitQuiz}
                                disabled={submitting}
                                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {submitting ? 'Submitting…' : 'Submit ✓'}
                            </button>
                        )}
                    </div>

                    {/* Answered count hint */}
                    <p className="mt-5 text-center text-[11px] text-slate-400">
                        {answeredCount} of {questions.length} answered
                        {answeredCount < questions.length &&
                            ' — you can submit anytime'}
                    </p>
                </div>
            </div>

            {/* ── Floating submit (always accessible) ─────────────────────── */}
            {currentQ < questions.length - 1 && (
                <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
                    <div className="mx-auto flex max-w-3xl justify-end">
                        <button
                            onClick={submitQuiz}
                            disabled={submitting}
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2 text-[13px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                            {submitting ? 'Submitting…' : 'Submit early ✓'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    ) : null;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3 — Results
    // ─────────────────────────────────────────────────────────────────────────
    const ResultsPhase = result ? (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto max-w-2xl space-y-5">
                {/* Score card */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* Top stripe */}
                    <div
                        className={`h-2 w-full ${result.passed ? 'bg-emerald-400' : 'bg-red-400'}`}
                    />

                    <div className="flex flex-col items-center px-8 py-8 text-center">
                        {/* Score circle */}
                        <ScoreCircle
                            score={result.score}
                            passed={result.passed}
                        />

                        {/* Passed / Failed badge */}
                        <div
                            className={`mt-5 inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-[14px] font-bold ${
                                result.passed
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-600'
                            }`}
                        >
                            {result.passed ? '✓ PASSED' : '✗ FAILED'}
                        </div>

                        {/* Skill added banner */}
                        {result.skill_added && (
                            <div className="mt-4 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                                <p className="text-[14px] font-semibold text-emerald-700">
                                    🎉{' '}
                                    <span className="font-bold">
                                        {result.skill_name}
                                    </span>{' '}
                                    skill added to your CV!
                                </p>
                            </div>
                        )}

                        {/* Stats row */}
                        <div className="mt-6 grid w-full grid-cols-3 gap-3">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4">
                                <p className="text-[20px] font-extrabold text-slate-800">
                                    {result.correct_answers}/
                                    {result.total_questions}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Correct
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4">
                                <p className="text-[20px] font-extrabold text-slate-800">
                                    {result.score}%
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Score
                                </p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4">
                                <p
                                    className={`text-[14px] font-bold capitalize ${DIFFICULTY_SCORE_RING[result.level]}`}
                                >
                                    {result.level}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Level
                                </p>
                            </div>
                        </div>

                        {/* Need to pass note */}
                        {!result.passed && (
                            <p className="mt-4 text-[12px] text-slate-400">
                                You need {assessment.pass_score}% to pass. Keep
                                practising!
                            </p>
                        )}
                    </div>
                </div>

                {/* Answer review (collapsible) */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                        onClick={() => setReviewOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-6 py-4 transition hover:bg-slate-50"
                    >
                        <span className="text-[14px] font-bold text-slate-800">
                            📋 Answer Review
                        </span>
                        <span className="text-[12px] font-medium text-slate-400">
                            {reviewOpen ? '▲ Hide' : '▼ Show'}
                        </span>
                    </button>

                    {reviewOpen && (
                        <div className="space-y-3 border-t border-slate-100 px-4 pt-3 pb-4">
                            {result.answers_detail.map((detail, i) => (
                                <ReviewItem
                                    key={detail.question_id}
                                    detail={detail}
                                    index={i}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => router.visit('/quiz')}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        ← Back to Quizzes
                    </button>
                    <button
                        onClick={retake}
                        className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        🔄 Retake Quiz
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AppLayout>
            <Head title={`${assessment.title} - Quiz`} />

            {phase === 'intro' && IntroPhase}
            {phase === 'quiz' && QuizPhase}
            {phase === 'results' && ResultsPhase}
        </AppLayout>
    );
}
