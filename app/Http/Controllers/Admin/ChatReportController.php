<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatReport;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ChatReportController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $category = $request->string('category')->toString();

        $reports = ChatReport::query()
            ->with([
                'reporter:id,name,email',
                'reportedUser:id,name,email,account_status',
                'reviewer:id,name',
            ])
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ChatReport $report) => $this->summary($report));

        return Inertia::render('admin/chat-reports/index', [
            'reports' => $reports,
            'filters' => [
                'status' => $status !== '' ? $status : 'pending',
                'category' => $category,
            ],
            'statusOptions' => ['pending', 'reviewed', 'dismissed'],
            'categoryOptions' => ['scam', 'insult', 'other'],
            'stats' => [
                'pending' => ChatReport::where('status', 'pending')->count(),
                'reviewed' => ChatReport::where('status', 'reviewed')->count(),
                'dismissed' => ChatReport::where('status', 'dismissed')->count(),
            ],
        ]);
    }

    public function show(ChatReport $chatReport): Response
    {
        $chatReport->load([
            'reporter:id,name,email',
            'reportedUser:id,name,email,account_status,company_name',
            'reviewer:id,name',
            'conversation.vacancy:id,title',
        ]);

        $recentMessages = Message::query()
            ->where('conversation_id', $chatReport->conversation_id)
            ->with('sender:id,name')
            ->latest()
            ->take(20)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (Message $message) => [
                'id' => $message->id,
                'body' => $message->previewText(),
                'sender_name' => $message->sender?->name,
                'sender_id' => $message->sender_id,
                'created_at' => $message->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/chat-reports/show', [
            'report' => $this->detail($chatReport),
            'recent_messages' => $recentMessages,
            'statusOptions' => ['pending', 'reviewed', 'dismissed'],
            'accountStatusOptions' => ['active', 'suspended', 'blocked'],
        ]);
    }

    public function update(Request $request, ChatReport $chatReport): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'reviewed', 'dismissed'])],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
            'reported_user_status' => ['nullable', Rule::in(['active', 'suspended', 'blocked'])],
        ]);

        $chatReport->forceFill([
            'status' => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? null,
        ]);

        if ($validated['status'] !== 'pending') {
            $chatReport->reviewed_by = Auth::id();
            $chatReport->reviewed_at = now();
        } else {
            $chatReport->reviewed_by = null;
            $chatReport->reviewed_at = null;
        }

        $chatReport->save();

        if (! empty($validated['reported_user_status'])) {
            $reportedUser = User::find($chatReport->reported_user_id);

            if ($reportedUser && ! $reportedUser->hasRole('admin') && $reportedUser->id !== Auth::id()) {
                $reportedUser->forceFill([
                    'account_status' => $validated['reported_user_status'],
                    'status_changed_at' => now(),
                ])->save();
            }
        }

        return back()->with('success', 'Report updated.');
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(ChatReport $report): array
    {
        return [
            'id' => $report->id,
            'category' => $report->category,
            'reason' => $report->reason,
            'status' => $report->status,
            'created_at' => $report->created_at?->toIso8601String(),
            'reporter' => [
                'id' => $report->reporter?->id,
                'name' => $report->reporter?->name,
                'email' => $report->reporter?->email,
            ],
            'reported_user' => [
                'id' => $report->reportedUser?->id,
                'name' => $report->reportedUser?->name,
                'email' => $report->reportedUser?->email,
                'account_status' => $report->reportedUser?->account_status ?? 'active',
            ],
            'reviewer_name' => $report->reviewer?->name,
            'reviewed_at' => $report->reviewed_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(ChatReport $report): array
    {
        return [
            ...$this->summary($report),
            'admin_notes' => $report->admin_notes,
            'conversation_id' => $report->conversation_id,
            'vacancy_title' => $report->conversation?->vacancy?->title,
            'reported_user' => [
                'id' => $report->reportedUser?->id,
                'name' => $report->reportedUser?->name,
                'email' => $report->reportedUser?->email,
                'company_name' => $report->reportedUser?->company_name,
                'account_status' => $report->reportedUser?->account_status ?? 'active',
            ],
        ];
    }
}
