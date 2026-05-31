<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\HireReview;
use Illuminate\Http\Request;

class HireReviewController extends Controller
{
    /** POST /applications/{application}/review */
    public function store(Request $request, Application $application)
    {
        abort_if($application->status !== 'hired', 422, 'Reviews are only available after a hire.');

        $application->loadMissing('vacancy:id,user_id');

        $reviewerId = auth()->id();
        $employerId = $application->vacancy->user_id;
        $seekerId = $application->user_id;

        abort_if($reviewerId !== $employerId && $reviewerId !== $seekerId, 403);

        $revieweeId = $reviewerId === $employerId ? $seekerId : $employerId;

        $data = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $existing = HireReview::where('application_id', $application->id)
            ->where('reviewer_id', $reviewerId)
            ->first();

        if ($existing) {
            return back()->withErrors(['review' => 'You have already submitted a review for this hire.']);
        }

        HireReview::create([
            'application_id' => $application->id,
            'reviewer_id'    => $reviewerId,
            'reviewee_id'    => $revieweeId,
            'rating'         => $data['rating'],
            'comment'        => $data['comment'] ?? null,
        ]);

        return back()->with('success', 'Review submitted. Thank you!');
    }
}
