<?php

namespace App\Http\Controllers;

use App\Models\Cv;
use App\Models\CvExperience;
use App\Models\CvEducation;
use App\Models\CvSkill;
use App\Models\CvProject;
use App\Services\AiCvSummaryService;
use App\Support\PhpIniSize;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CvController extends Controller
{
    /** Mark CV as edited so cached AI suggestions are regenerated. */
    private function markCvContentChanged(Cv $cv): void
    {
        $cv->markContentChanged();
    }

    public function index()
    {
        $cvs = Cv::where('user_id', auth()->id())
            ->withCount(['experiences', 'educations', 'skills', 'projects'])
            ->latest()
            ->get();

        return Inertia::render('CV/index', ['cvs' => $cvs]);
    }

    public function create()
    {
        return Inertia::render('CV/Create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'    => 'required|string|max:120',
            'template' => 'nullable|in:classic,modern,minimal,executive,creative',
        ]);

        $cv = Cv::create([
            'user_id'       => auth()->id(),
            'title'         => $data['title'],
            'template'      => $data['template'] ?? 'classic',
            'source'        => 'builder',
            'is_default'    => false,
            'section_order' => ['experience', 'education', 'skills', 'projects'],
        ]);

        return redirect()->route('cv.show', $cv->id);
    }

    public function upload(Request $request)
    {
        \Illuminate\Support\Facades\Log::debug('CV Upload debug', [
            'content_type' => $request->header('Content-Type'),
            'has_file'     => $request->hasFile('file'),
            'files_raw'    => $_FILES,
            'input_keys'   => array_keys($request->all()),
        ]);

        // If PHP silently dropped the file (upload exceeded upload_max_filesize),
        // hasFile returns false even though the field was submitted.
        if (! $request->hasFile('file') && $request->isMethod('post')) {
            $maxLabel = PhpIniSize::uploadMaxLabel();
            return back()->withErrors([
                'file' => "The file could not be received by the server. Make sure it is under {$maxLabel}.",
            ]);
        }

        $maxKb = max(PhpIniSize::uploadMaxKilobytes(), 20480);

        $data = $request->validate([
            'file'  => ['required', 'file', 'max:'.$maxKb, 'mimes:pdf,docx'],
            'title' => ['nullable', 'string', 'max:120'],
        ]);

        $file = $request->file('file');

        $path = $file->store('cv-uploads', 'public');
        $title = $data['title'] ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        Cv::create([
            'user_id'           => auth()->id(),
            'title'             => $title,
            'source'            => 'upload',
            'file_path'         => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type'         => $file->getMimeType(),
            'is_default'        => ! Cv::where('user_id', auth()->id())->exists(),
        ]);

        return redirect()->route('cv.index')->with('success', 'CV uploaded successfully.');
    }

    public function download($id)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($id);

        abort_if($cv->source !== 'upload' || ! $cv->file_path, 404);

        return Storage::disk('public')->download(
            $cv->file_path,
            $cv->original_filename ?? 'cv.pdf'
        );
    }

    public function show($id)
    {
        $cv = Cv::with(['experiences', 'educations', 'skills', 'projects'])
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        if ($cv->source === 'upload') {
            return redirect()->route('cv.download', $cv->id);
        }

        return Inertia::render('CV/Show', ['cv' => $cv]);
    }

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
            'template'      => 'nullable|in:classic,modern,minimal,executive,creative',
            'accent_color'  => 'nullable|string|max:20',
            'section_order' => 'nullable|array',
        ]);

        $cv->update($data);

        return back();
    }

    public function destroy($id)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($id);

        if ($cv->photo_path) {
            Storage::disk('public')->delete($cv->photo_path);
        }

        if ($cv->file_path) {
            Storage::disk('public')->delete($cv->file_path);
        }

        $cv->delete();
        return redirect()->route('cv.index');
    }

    public function uploadPhoto(Request $request, $id)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($id);
        $request->validate(['photo' => 'required|image|max:3072|mimes:jpg,jpeg,png,webp']);

        if ($cv->photo_path) {
            Storage::disk('public')->delete($cv->photo_path);
        }

        $path = $request->file('photo')->store('cv-photos', 'public');
        $cv->update(['photo_path' => $path]);

        return back();
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
        CvExperience::create($data);
        $this->markCvContentChanged($cv);
        return back();
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
        $this->markCvContentChanged($cv);
        return back();
    }

    public function destroyExperience($cvId, $expId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvExperience::where('cv_id', $cv->id)->findOrFail($expId)->delete();
        $this->markCvContentChanged($cv);
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
        CvEducation::create($data);
        $this->markCvContentChanged($cv);
        return back();
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
        $this->markCvContentChanged($cv);
        return back();
    }

    public function destroyEducation($cvId, $eduId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvEducation::where('cv_id', $cv->id)->findOrFail($eduId)->delete();
        $this->markCvContentChanged($cv);
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
        $this->markCvContentChanged($cv);
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
        $this->markCvContentChanged($cv);
        return back();
    }

    public function destroySkill($cvId, $skillId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvSkill::where('cv_id', $cv->id)->findOrFail($skillId)->delete();
        $this->markCvContentChanged($cv);
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
        $this->markCvContentChanged($cv);
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
        $this->markCvContentChanged($cv);
        return back();
    }

    public function destroyProject($cvId, $projectId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        CvProject::where('cv_id', $cv->id)->findOrFail($projectId)->delete();
        $this->markCvContentChanged($cv);
        return back();
    }

    // ── Reorder ───────────────────────────────────────────────────────────────

    public function reorder(Request $request, $cvId)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($cvId);
        $request->validate([
            'type'    => 'required|in:experience,education,skills,projects',
            'order'   => 'required|array',
            'order.*' => 'integer',
        ]);

        $map = [
            'experience' => CvExperience::class,
            'education'  => CvEducation::class,
            'skills'     => CvSkill::class,
            'projects'   => CvProject::class,
        ];

        $model = $map[$request->type];
        foreach ($request->order as $position => $id) {
            $model::where('cv_id', $cv->id)->where('id', $id)->update(['sort_order' => $position]);
        }

        $this->markCvContentChanged($cv);

        return back();
    }

    // ────────────────────────────────────────────────────────────────────────
    //  AI SUMMARY (seeker)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * POST /cv/{id}/ai-summary
     * Generate (or refresh) the AI summary + improvement suggestions for the
     * owner's CV. Persists the result so it can be reused without recalling
     * the LLM until the user explicitly refreshes.
     */
    public function aiSummary(Request $request, $id, AiCvSummaryService $ai)
    {
        $cv = Cv::where('user_id', auth()->id())
            ->with(['experiences', 'educations', 'skills', 'projects'])
            ->findOrFail($id);

        // Only return cache when the CV hasn't changed since generation.
        $useCache = $request->boolean('cached')
            && $cv->ai_summary
            && $cv->ai_summary_generated_at
            && $cv->ai_summary_generated_at->gte($cv->updated_at);

        if ($useCache) {
            return response()->json([
                'cached'              => true,
                'ai_summary'          => $cv->ai_summary,
                'ai_suggestions'      => $cv->ai_suggestions,
                'ai_improvements'     => $cv->ai_improvements,
                'ai_strength_score'   => $cv->ai_strength_score,
                'generated_at'        => $cv->ai_summary_generated_at,
                'configured'          => $ai->isConfigured(),
            ]);
        }

        $result = $ai->generateForSeeker($cv);

        $now = Carbon::now();
        $cv->update([
            'ai_summary'              => $result['ai_summary'],
            'ai_suggestions'          => $result['ai_suggestions'],
            'ai_improvements'         => $result['ai_improvements'],
            'ai_strength_score'       => $result['ai_strength_score'],
            'ai_summary_generated_at' => $now,
            'updated_at'              => $now,
        ]);

        return response()->json([
            'cached'              => false,
            'ai_summary'          => $cv->ai_summary,
            'ai_suggestions'      => $cv->ai_suggestions,
            'ai_improvements'     => $cv->ai_improvements,
            'ai_strength_score'   => $cv->ai_strength_score,
            'generated_at'        => $cv->ai_summary_generated_at,
            'configured'          => $ai->isConfigured(),
        ]);
    }

    /**
     * POST /cv/{id}/use-ai-summary
     * Apply the AI-generated summary to the CV's actual `summary` field.
     */
    public function useAiSummary($id)
    {
        $cv = Cv::where('user_id', auth()->id())->findOrFail($id);
        abort_if(!$cv->ai_summary, 422, 'No AI summary available yet — generate one first.');

        $cv->update(['summary' => $cv->ai_summary]);

        return response()->json(['summary' => $cv->summary]);
    }
}
