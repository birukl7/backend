<?php

namespace App\Http\Controllers;

use App\Models\Vacancy;
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
}