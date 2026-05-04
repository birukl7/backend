<?php

namespace App\Http\Controllers;

use App\Models\Cv;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CvController extends Controller
{
    public function create()
    {
        return Inertia::render('CV/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
        ]);

        $cv = Cv::create([
            'user_id' => auth()->id(),
            'title' => $request->title,
            'is_default' => false,
        ]);

        return redirect()->route('cv.show', $cv->id);
    }

    public function show($id)
    {
        $cv = Cv::with(['experiences', 'educations', 'skills'])->findOrFail($id);

        return Inertia::render('CV/Show', [
            'cv' => $cv
        ]);
    }
}