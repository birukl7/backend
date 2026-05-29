<?php

namespace App\Http\Controllers;

use App\Services\HiringStatsService;

class HiringStatsController extends Controller
{
    public function __construct(private HiringStatsService $stats)
    {
    }

    /**
     * GET /hiring-statistics
     * Public page showing platform-wide hiring statistics.
     */
    public function index()
    {
        return inertia('hiring-statistics', [
            'stats'         => $this->stats->publicStats(),
            'topEmployers'  => $this->stats->topHiringEmployers(),
            'hiresOverTime' => $this->stats->hiresOverTime(),
        ]);
    }
}
