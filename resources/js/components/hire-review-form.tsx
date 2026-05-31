import { useForm } from '@inertiajs/react';
import { useState } from 'react';

interface ExistingReview {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer?: { id: number; name: string };
}

interface Props {
    applicationId: number;
    existingReview?: ExistingReview | null;
    revieweeLabel: string;
}

function StarPicker({
    value,
    onChange,
}: {
    value: number;
    onChange: (n: number) => void;
}) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    className="rounded p-0.5 transition-transform hover:scale-110"
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                >
                    <svg
                        className={`h-6 w-6 ${n <= value ? 'text-amber-400' : 'text-slate-200'}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                </button>
            ))}
        </div>
    );
}

export default function HireReviewForm({
    applicationId,
    existingReview,
    revieweeLabel,
}: Props) {
    const [rating, setRating] = useState(existingReview?.rating ?? 0);
    const form = useForm({ rating: 0, comment: '' });

    if (existingReview) {
        return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                <p className="text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
                    Your review
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <StarPicker value={existingReview.rating} onChange={() => {}} />
                    <span className="text-[12px] font-medium text-emerald-700">
                        {existingReview.rating}/5 for {revieweeLabel}
                    </span>
                </div>
                {existingReview.comment && (
                    <p className="mt-2 text-[13px] leading-relaxed text-emerald-800">
                        {existingReview.comment}
                    </p>
                )}
            </div>
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (rating < 1) return;
        form.transform((data) => ({ ...data, rating }));
        form.post(`/applications/${applicationId}/review`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
        >
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                Rate {revieweeLabel}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
                Share your experience working together on this hire.
            </p>
            <div className="mt-3">
                <StarPicker value={rating} onChange={setRating} />
            </div>
            <textarea
                value={form.data.comment}
                onChange={(e) => form.setData('comment', e.target.value)}
                placeholder="Optional comment..."
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {form.errors.rating && (
                <p className="mt-1 text-[12px] text-red-500">{form.errors.rating}</p>
            )}
            {form.errors.review && (
                <p className="mt-1 text-[12px] text-red-500">{form.errors.review}</p>
            )}
            <button
                type="submit"
                disabled={rating < 1 || form.processing}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
                {form.processing ? 'Submitting…' : 'Submit review'}
            </button>
        </form>
    );
}
