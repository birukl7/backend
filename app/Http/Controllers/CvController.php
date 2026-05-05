<?php

namespace App\Http\Controllers;

use App\Models\Cv;
use App\Models\CvExperience;
use App\Models\CvEducation;
use App\Models\CvSkill;
use App\Models\CvProject;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CvController extends Controller
{
    // GET /cv  — list all CVs for the authenticated user
    public function index()
    {
        $cvs = Cv::where('user_id', auth()->id())
            ->withCount(['experiences', 'educations', 'skills', 'projects'])
            ->latest()
            ->get();

        return Inertia::render('CV/index', ['cvs' => $cvs]);
    }

    // GET /cv/create  — show the "name your CV" page (optional, can redirect straight to show)
    public function create()
    {
        return Inertia::render('CV/Create');
    }

    // POST /cv
    public function store(Request $request)
    {
        $request->validate(['title' => 'required|string|max:120']);

        $cv = Cv::create([
            'user_id'      => auth()->id(),
            'title'        => $request->title,
            'is_default'   => false,
            'section_order' => ['experience', 'education', 'skills', 'projects'],
        ]);

        return redirect()->route('cv.show', $cv->id);
    }

    // GET /cv/{id}
    public function show($id)
    {
        $cv = Cv::with(['experiences', 'educations', 'skills', 'projects'])
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        return Inertia::render('CV/show', ['cv' => $cv]);
    }

    // PUT /cv/{id}  — update top-level CV fields (personal info, template, etc.)
    public function update(Request $request, $id)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($id);

        $data = $request->validate([
            'title'         => 'sometimes|string|max:120',
            'full_name'     => 'nullable|string|max:120',
            'email'         => 'nullable|email|max:120',
            'phone'         => 'nullable|string|max:40',
            'location'      => 'nullable|string|max:120',
            'website'       => 'nullable|string|max:255',
            'linkedin'      => 'nullable|string|max:255',
            'github'        => 'nullable|string|max:255',
            'summary'       => 'nullable|string',
            'template'      => 'nullable|in:classic,modern,minimal',
            'accent_color'  => 'nullable|string|max:20',
            'section_order' => 'nullable|array',
        ]);

        $cv->update($data);

        return back();
    }

    // DELETE /cv/{id}
    public function destroy($id)
    {
        Cv::where('user_id', auth()->id())->findOrFail($id)->delete();
        return redirect()->route('cv.index');
    }

    // ── Experiences ───────────────────────────────────────────────────────────

    public function storeExperience(Request $request, $cvId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $data = $request->validate([
            'job_title'    => 'required|string|max:120',
            'company_name' => 'required|string|max:120',
            'location'     => 'nullable|string|max:120',
            'description'  => 'nullable|string',
            'start_date'   => 'required|date',
            'end_date'     => 'nullable|date',
            'is_current'   => 'boolean',
        ]);
        $data['cv_id'] = $cv->id;
        $data['sort_order'] = $cv->experiences()->max('sort_order') + 1;
        $exp = CvExperience::create($data);
        return back()->with('experience', $exp);
    }

    public function updateExperience(Request $request, $cvId, $expId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $exp = CvExperience::where('cv_id', $cv->id)->findOrFail($expId);
        $exp->update($request->validate([
            'job_title'    => 'required|string|max:120',
            'company_name' => 'required|string|max:120',
            'location'     => 'nullable|string|max:120',
            'description'  => 'nullable|string',
            'start_date'   => 'required|date',
            'end_date'     => 'nullable|date',
            'is_current'   => 'boolean',
        ]));
        return back();
    }

    public function destroyExperience($cvId, $expId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvExperience::where('cv_id', $cv->id)->findOrFail($expId)->delete();
        return back();
    }

    // ── Education ─────────────────────────────────────────────────────────────

    public function storeEducation(Request $request, $cvId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $data = $request->validate([
            'institution_name' => 'required|string|max:120',
            'degree'           => 'required|string|max:120',
            'field_of_study'   => 'required|string|max:120',
            'location'         => 'nullable|string|max:120',
            'description'      => 'nullable|string',
            'start_date'       => 'required|date',
            'end_date'         => 'nullable|date',
            'is_current'       => 'boolean',
        ]);
        $data['cv_id'] = $cv->id;
        $data['sort_order'] = $cv->educations()->max('sort_order') + 1;
        $edu = CvEducation::create($data);
        return back()->with('education', $edu);
    }

    public function updateEducation(Request $request, $cvId, $eduId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $edu = CvEducation::where('cv_id', $cv->id)->findOrFail($eduId);
        $edu->update($request->validate([
            'institution_name' => 'required|string|max:120',
            'degree'           => 'required|string|max:120',
            'field_of_study'   => 'required|string|max:120',
            'location'         => 'nullable|string|max:120',
            'description'      => 'nullable|string',
            'start_date'       => 'required|date',
            'end_date'         => 'nullable|date',
            'is_current'       => 'boolean',
        ]));
        return back();
    }

    public function destroyEducation($cvId, $eduId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvEducation::where('cv_id', $cv->id)->findOrFail($eduId)->delete();
        return back();
    }

    // ── Skills ────────────────────────────────────────────────────────────────

    public function storeSkill(Request $request, $cvId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $data = $request->validate([
            'skill_name'        => 'required|string|max:80',
            'proficiency_level' => 'required|in:beginner,intermediate,advanced,expert',
            'category'          => 'nullable|string|max:80',
        ]);
        $data['cv_id'] = $cv->id;
        $data['sort_order'] = $cv->skills()->max('sort_order') + 1;
        CvSkill::create($data);
        return back();
    }

    public function updateSkill(Request $request, $cvId, $skillId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $skill = CvSkill::where('cv_id', $cv->id)->findOrFail($skillId);
        $skill->update($request->validate([
            'skill_name'        => 'required|string|max:80',
            'proficiency_level' => 'required|in:beginner,intermediate,advanced,expert',
            'category'          => 'nullable|string|max:80',
        ]));
        return back();
    }

    public function destroySkill($cvId, $skillId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvSkill::where('cv_id', $cv->id)->findOrFail($skillId)->delete();
        return back();
    }

    // ── Projects ──────────────────────────────────────────────────────────────

    public function storeProject(Request $request, $cvId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $data = $request->validate([
            'project_name' => 'required|string|max:120',
            'description'  => 'nullable|string',
            'url'          => 'nullable|string|max:255',
            'tech_stack'   => 'nullable|string|max:255',
            'start_date'   => 'nullable|date',
            'end_date'     => 'nullable|date',
        ]);
        $data['cv_id'] = $cv->id;
        $data['sort_order'] = $cv->projects()->max('sort_order') + 1;
        CvProject::create($data);
        return back();
    }

    public function updateProject(Request $request, $cvId, $projectId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $project = CvProject::where('cv_id', $cv->id)->findOrFail($projectId);
        $project->update($request->validate([
            'project_name' => 'required|string|max:120',
            'description'  => 'nullable|string',
            'url'          => 'nullable|string|max:255',
            'tech_stack'   => 'nullable|string|max:255',
            'start_date'   => 'nullable|date',
            'end_date'     => 'nullable|date',
        ]));
        return back();
    }

    public function destroyProject($cvId, $projectId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvProject::where('cv_id', $cv->id)->findOrFail($projectId)->delete();
        return back();
    }

    // ── Reorder ───────────────────────────────────────────────────────────────

    public function reorder(Request $request, $cvId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $request->validate([
            'type'  => 'required|in:experience,education,skills,projects',
            'order' => 'required|array',
            'order.*' => 'integer',
        ]);

        $map = [
            'experience' => [CvExperience::class, 'cv_id'],
            'education'  => [CvEducation::class,  'cv_id'],
            'skills'     => [CvSkill::class,       'cv_id'],
            'projects'   => [CvProject::class,     'cv_id'],
        ];

        [$model] = $map[$request->type];
        foreach ($request->order as $position => $id) {
            $model::where('cv_id', $cv->id)->where('id', $id)->update(['sort_order' => $position]);
        }

        return back();
    }
}