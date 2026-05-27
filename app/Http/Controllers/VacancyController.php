<?php

namespace App\Http\Controllers;

use App\Models\AiMatch;
use App\Models\AppNotification;
use App\Models\Application;
use App\Models\JobScreening;
use App\Models\Vacancy;
use App\Services\AiScreeningService;
use Illuminate\Http\Request;

class VacancyController extends Controller
{
    /**
     * Employer: list only their own vacancies.
     */
    public function index()
    {
        $vacancies = Vacancy::where('user_id', auth()->id())
            ->latest()
            ->get();

        return inertia('employer/jobs/index', [
            'vacancies' => $vacancies,
        ]);
    }

    /**
     * Job seekers: list all open vacancies.
     */
    public function browse()
    {
        return inertia('vacancy/index', [
            'vacancies' => Vacancy::where('status', 'open')->latest()->get(),
        ]);
    }

    public function create()
    {
        // Handled via dialog on index; not needed as a separate page. 842684
        // 786436
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'                => 'required|string|max:255',
            'description'          => 'required|string',
            'requirements'         => 'nullable|string',
            'location'             => 'nullable|string|max:255',
            'salary_min'           => 'nullable|numeric|min:0',
            'salary_max'           => 'nullable|numeric|min:0|gte:salary_min',
            'employment_type'      => 'required|in:full_time,part_time,contract,temporary,internship',
            'status'               => 'required|in:open,closed',
            'work_type'            => 'required|in:remote,on_site,hybrid',
            'application_deadline' => 'nullable|date|after:today',
        ]);

        $data['user_id'] = auth()->id();

        Vacancy::create($data);

        return back()->with('success', 'Job posted successfully.');
    }

    public function show(Vacancy $vacancy)
    {
        //
    }

    public function edit(Vacancy $vacancy)
    {
        //
    }

    public function update(Request $request, Vacancy $vacancy)
    {
        // Only the owner can update
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $data = $request->validate([
            'title'                => 'required|string|max:255',
            'description'          => 'required|string',
            'requirements'         => 'nullable|string',
            'location'             => 'nullable|string|max:255',
            'salary_min'           => 'nullable|numeric|min:0',
            'salary_max'           => 'nullable|numeric|min:0|gte:salary_min',
            'employment_type'      => 'required|in:full_time,part_time,contract,temporary,internship',
            'status'               => 'required|in:open,closed',
            'work_type'            => 'required|in:remote,on_site,hybrid',
            'application_deadline' => 'nullable|date',
        ]);

        $vacancy->update($data);

        return back()->with('success', 'Job updated successfully.');
    }

    public function destroy(Vacancy $vacancy)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $vacancy->delete();

        return back()->with('success', 'Job deleted.');
    }

    public function applications(Vacancy $vacancy)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $applications = $vacancy->applications()
            ->with(['user:id,name,email', 'cv:id,title,full_name'])
            ->latest()
            ->get();

        return response()->json($applications);
    }

    /**
     * Return AI-matched users for a vacancy (employer only).
     * Excludes users who have already applied.
     */
    public function aiSuggestions(Vacancy $vacancy)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        // Get top 15 AI matches for this vacancy, best score first
        $matches = AiMatch::where('vacancy_id', $vacancy->id)
            ->with(['user:id,name,email'])
            ->orderByDesc('match_score')
            ->limit(15)
            ->get();

        // Collect user_ids who have already applied so we can exclude them
        $appliedUserIds = Application::where('vacancy_id', $vacancy->id)
            ->pluck('user_id')
            ->all();

        // Filter out already-applied users and map to a clean payload
        $suggestions = $matches
            ->filter(fn ($match) => ! in_array($match->user_id, $appliedUserIds))
            ->values()
            ->map(fn ($match) => [
                'user_id'       => $match->user_id,
                'user_name'     => optional($match->user)->name,
                'user_email'    => optional($match->user)->email,
                'match_score'   => $match->match_score,
                'match_percent' => round($match->match_score * 100),
            ]);

        // Tell the frontend which users were already invited for this vacancy
        $suggestedUserIds = $suggestions->pluck('user_id')->all();
        $alreadyInvitedIds = AppNotification::where('type', 'job_invitation')
            ->whereIn('user_id', $suggestedUserIds)
            ->whereRaw("JSON_EXTRACT(data, '$.vacancy_id') = ?", [$vacancy->id])
            ->pluck('user_id')
            ->all();

        return response()->json([
            'suggestions'        => $suggestions,
            'already_invited_ids' => $alreadyInvitedIds,
        ]);
    }

    /**
     * Send a job invitation notification to a matched user (employer only).
     */
    public function inviteUser(Request $request, Vacancy $vacancy, int $userId)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $request->validate([
            'message' => 'nullable|string|max:500',
        ]);

        $target = \App\Models\User::findOrFail($userId);

        $customMessage = $request->message
            ?? "Check it out and apply if you're interested!";

        AppNotification::create([
            'user_id' => $target->id,
            'type'    => 'job_invitation',
            'title'   => "You've been recommended for a position",
            'body'    => "An employer thinks you're a great match for \"{$vacancy->title}\". {$customMessage}",
            'data'    => [
                'vacancy_id'    => $vacancy->id,
                'vacancy_title' => $vacancy->title,
                'employer_id'   => auth()->id(),
            ],
        ]);

        return response()->json(['ok' => true]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  SCREENING SETUP (employer side)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /employer/jobs/{vacancy}/screening
     * Return the current screening config (creates an empty one on the fly).
     */
    public function showScreening(Vacancy $vacancy)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $screening = $vacancy->screening()->firstOrCreate(
            ['vacancy_id' => $vacancy->id],
            [
                'is_enabled'    => false,
                'intro_message' => "Hi! I'm the AI screener for the \"{$vacancy->title}\" role. I'll ask a few quick questions — your answers help us match you to this position.",
                'criteria'      => [],
                'questions'     => [],
                'passing_score' => 60,
            ]
        );

        return response()->json(['screening' => $screening]);
    }

    /**
     * PUT /employer/jobs/{vacancy}/screening
     * Save the screening config.
     */
    public function updateScreening(Request $request, Vacancy $vacancy)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $data = $request->validate([
            'is_enabled'        => 'required|boolean',
            'intro_message'     => 'nullable|string|max:1000',
            'criteria'          => 'nullable|array',
            'criteria.*'        => 'string|max:200',
            'questions'         => 'nullable|array',
            'questions.*.id'    => 'required|string|max:40',
            'questions.*.text'  => 'required|string|max:500',
            'questions.*.type'  => 'required|in:open,yes_no,multi',
            'questions.*.options'  => 'nullable|array',
            'questions.*.options.*'=> 'string|max:200',
            'questions.*.required' => 'required|boolean',
            'questions.*.weight'   => 'required|integer|min:1|max:5',
            'passing_score'        => 'required|integer|min:0|max:100',
            'auto_reject_below'    => 'nullable|integer|min:0|max:100',
        ]);

        $screening = $vacancy->screening()->updateOrCreate(
            ['vacancy_id' => $vacancy->id],
            $data
        );

        return response()->json(['screening' => $screening]);
    }

    /**
     * POST /employer/jobs/{vacancy}/screening/tune
     * Chat with the AI to design the screening.
     */
    public function tuneScreening(Request $request, Vacancy $vacancy, AiScreeningService $ai)
    {
        abort_if($vacancy->user_id !== auth()->id(), 403);

        $data = $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array',
            'history.*.role'    => 'required_with:history|in:user,assistant',
            'history.*.content' => 'required_with:history|string',
        ]);

        $result = $ai->tuneScreening($vacancy, $data['message'], $data['history'] ?? []);

        return response()->json([
            'configured' => $ai->isConfigured(),
            ...$result,
        ]);
    }
}
