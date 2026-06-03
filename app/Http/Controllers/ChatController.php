<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\PhpIniSize;
use App\Support\PublicUploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ChatController extends Controller
{
    /**
     * List all conversations for the authenticated user.
     * Employer sees conversations where they are the employer.
     * Job seeker sees conversations where they are the job seeker.
     */
    public function index(Request $request): \Inertia\Response
    {
        $user = Auth::user();
        $isEmployer = $user->hasRole('employer');

        $conversations = Conversation::with([
            'employer:id,name,company_name,profile_photo',
            'jobSeeker:id,name,profile_photo',
            'vacancy:id,title',
            'latestMessage',
        ])
            ->when($isEmployer, fn ($q) => $q->where('employer_id', $user->id))
            ->when(! $isEmployer, fn ($q) => $q->where('job_seeker_id', $user->id))
            ->orderByDesc(function ($query) {
                $query->select('created_at')
                    ->from('messages')
                    ->whereColumn('messages.conversation_id', 'conversations.id')
                    ->latest()
                    ->limit(1);
            })
            ->get()
            ->map(function (Conversation $c) use ($user) {
                return [
                    'id'             => $c->id,
                    'vacancy'        => $c->vacancy ? ['id' => $c->vacancy->id, 'title' => $c->vacancy->title] : null,
                    'other_user'     => $user->hasRole('employer')
                        ? ['id' => $c->jobSeeker->id, 'name' => $c->jobSeeker->name, 'avatar' => $c->jobSeeker->avatar]
                        : ['id' => $c->employer->id, 'name' => $c->employer->name, 'company' => $c->employer->company_name, 'avatar' => $c->employer->avatar],
                    'latest_message' => $c->latestMessage ? [
                        'body'       => $c->latestMessage->previewText(),
                        'created_at' => $c->latestMessage->created_at?->toISOString(),
                        'is_mine'    => $c->latestMessage->sender_id === $user->id,
                    ] : null,
                    'unread_count'   => $c->unreadCountFor($user->id),
                    'status'         => $c->status,
                    'updated_at'     => $c->updated_at?->toISOString(),
                ];
            });

        $activeConversationId = $request->query('conversation');
        $activeMessages = [];
        $activeConversation = null;

        if ($activeConversationId) {
            $conv = Conversation::with([
                'employer:id,name,company_name,profile_photo',
                'jobSeeker:id,name,profile_photo',
                'vacancy:id,title',
            ])->find($activeConversationId);

            if ($conv && ($conv->employer_id === $user->id || $conv->job_seeker_id === $user->id)) {
                // Mark incoming messages as read
                Message::where('conversation_id', $conv->id)
                    ->where('sender_id', '!=', $user->id)
                    ->whereNull('read_at')
                    ->update(['read_at' => now()]);

                $activeMessages = Message::where('conversation_id', $conv->id)
                    ->with('sender:id,name,profile_photo')
                    ->orderBy('created_at')
                    ->get()
                    ->map(fn (Message $m) => $m->toChatArray($user->id));

                $activeConversation = [
                    'id'         => $conv->id,
                    'vacancy'    => $conv->vacancy ? ['id' => $conv->vacancy->id, 'title' => $conv->vacancy->title] : null,
                    'other_user' => $user->hasRole('employer')
                        ? ['id' => $conv->jobSeeker->id, 'name' => $conv->jobSeeker->name, 'avatar' => $conv->jobSeeker->avatar]
                        : ['id' => $conv->employer->id, 'name' => $conv->employer->name, 'company' => $conv->employer->company_name, 'avatar' => $conv->employer->avatar],
                    'status'     => $conv->status,
                ];
            }
        }

        return Inertia::render($isEmployer ? 'employer/chat/index' : 'chat/index', [
            'conversations'       => $conversations,
            'active_conversation' => $activeConversation,
            'active_messages'     => $activeMessages,
        ]);
    }

    /**
     * Employer starts a new conversation with a job seeker.
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        abort_unless($user->hasRole('employer'), 403);

        $data = $request->validate([
            'job_seeker_id' => ['required', 'integer', 'exists:users,id'],
            'vacancy_id'    => ['nullable', 'integer', 'exists:vacancies,id'],
            'message'       => ['required', 'string', 'max:2000'],
        ]);

        $jobSeeker = User::findOrFail($data['job_seeker_id']);
        abort_unless($jobSeeker->hasRole('job_seeker'), 422);

        // Find or create the conversation
        $conversation = Conversation::firstOrCreate(
            [
                'employer_id'    => $user->id,
                'job_seeker_id'  => $data['job_seeker_id'],
                'vacancy_id'     => $data['vacancy_id'] ?? null,
            ],
            ['status' => 'active']
        );

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $user->id,
            'body'            => $data['message'],
        ]);

        // Touch conversation so ordering works
        $conversation->touch();

        // Notify the job seeker
        AppNotification::create([
            'user_id' => $data['job_seeker_id'],
            'type'    => 'new_message',
            'title'   => 'New message from '.($user->company_name ?: $user->name),
            'body'    => mb_strimwidth($data['message'], 0, 100, '…'),
            'data'    => [
                'conversation_id' => $conversation->id,
                'sender_id'       => $user->id,
                'sender_name'     => $user->name,
            ],
        ]);

        return response()->json([
            'conversation_id' => $conversation->id,
            'redirect'        => route('chat.index', ['conversation' => $conversation->id]),
        ]);
    }

    /**
     * Send a new message in an existing conversation.
     */
    public function sendMessage(Request $request, Conversation $conversation): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        abort_unless(
            $conversation->employer_id === $user->id || $conversation->job_seeker_id === $user->id,
            403
        );

        if (! $request->hasFile('attachment') && $request->isMethod('post')) {
            $maxLabel = PhpIniSize::uploadMaxLabel();
            $contentLength = (int) $request->server('CONTENT_LENGTH', 0);
            $postMax = PhpIniSize::toBytes((string) ini_get('post_max_size'));

            if ($contentLength > 0 && $postMax > 0 && $contentLength > $postMax) {
                throw ValidationException::withMessages([
                    'attachment' => "The file is too large for the server to accept (limit: {$maxLabel}).",
                ]);
            }
        }

        $maxKb = min(PhpIniSize::uploadMaxKilobytes(), 10240);

        $data = $request->validate([
            'body'       => ['nullable', 'string', 'max:2000'],
            'attachment' => ['nullable', 'file', 'max:'.$maxKb, 'mimes:jpeg,jpg,png,gif,webp,pdf'],
        ]);

        $body = trim($data['body'] ?? '');
        $hasFile = $request->hasFile('attachment');

        if ($body === '' && ! $hasFile) {
            throw ValidationException::withMessages([
                'body' => 'Type a message or attach a file.',
            ]);
        }

        $attachmentPath = null;
        $attachmentType = null;
        $attachmentName = null;

        if ($hasFile) {
            $file = $request->file('attachment');
            $attachmentPath = PublicUploads::store($file, 'chat-attachments');
            $attachmentType = $file->getMimeType() === 'application/pdf' ? 'pdf' : 'image';
            $attachmentName = $file->getClientOriginalName();
        }

        $message = Message::create([
            'conversation_id'           => $conversation->id,
            'sender_id'                 => $user->id,
            'body'                      => $body !== '' ? $body : null,
            'attachment_path'           => $attachmentPath,
            'attachment_type'           => $attachmentType,
            'attachment_original_name'  => $attachmentName,
        ]);

        $message->load('sender:id,name,profile_photo');

        $conversation->touch();

        // Determine recipient and send notification
        $recipientId = $conversation->employer_id === $user->id
            ? $conversation->job_seeker_id
            : $conversation->employer_id;

        AppNotification::create([
            'user_id' => $recipientId,
            'type'    => 'new_message',
            'title'   => 'New message from '.$user->name,
            'body'    => mb_strimwidth($message->previewText(), 0, 100, '…'),
            'data'    => [
                'conversation_id' => $conversation->id,
                'sender_id'       => $user->id,
                'sender_name'     => $user->name,
            ],
        ]);

        return response()->json($message->toChatArray($user->id));
    }

    /**
     * Poll endpoint — returns any messages newer than ?after=<id> as JSON.
     * The frontend calls this every ~1.5 s for real-time feel without a blocking SSE loop.
     */
    public function poll(Conversation $conversation): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        abort_unless(
            $conversation->employer_id === $user->id || $conversation->job_seeker_id === $user->id,
            403
        );

        $afterId = (int) request()->query('after', 0);

        $messages = Message::where('conversation_id', $conversation->id)
            ->where('id', '>', $afterId)
            ->with('sender:id,name,profile_photo')
            ->orderBy('id')
            ->get();

        // Mark incoming messages as read while we're here
        $incomingIds = $messages
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->pluck('id');

        if ($incomingIds->isNotEmpty()) {
            Message::whereIn('id', $incomingIds)->update(['read_at' => now()]);
        }

        return response()->json(
            $messages->map(fn (Message $m) => $m->toChatArray($user->id))->values()
        );
    }

    /**
     * Mark all messages in a conversation as read by the current user.
     */
    public function markRead(Conversation $conversation): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        abort_unless(
            $conversation->employer_id === $user->id || $conversation->job_seeker_id === $user->id,
            403
        );

        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
