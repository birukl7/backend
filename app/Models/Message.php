<?php

namespace App\Models;

use App\Support\PublicUploads;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
        'attachment_path',
        'attachment_type',
        'attachment_original_name',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function isRead(): bool
    {
        return ! is_null($this->read_at);
    }

    public function hasAttachment(): bool
    {
        return $this->attachment_path !== null && $this->attachment_path !== '';
    }

    public function attachmentUrl(): ?string
    {
        return PublicUploads::url($this->attachment_path);
    }

    /** Text shown in conversation list previews and notifications. */
    public function previewText(): string
    {
        $body = trim((string) $this->body);

        if ($body !== '') {
            return $body;
        }

        return match ($this->attachment_type) {
            'image' => '📷 Photo',
            'pdf'   => '📄 PDF',
            default => $this->hasAttachment() ? '📎 Attachment' : '',
        };
    }

    public function toChatArray(int $viewerId): array
    {
        $attachment = null;

        if ($this->hasAttachment() && $this->attachment_type) {
            $attachment = [
                'url'  => $this->attachmentUrl(),
                'type' => $this->attachment_type,
                'name' => $this->attachment_original_name ?? 'attachment',
            ];
        }

        return [
            'id'         => $this->id,
            'body'       => $this->body ?? '',
            'attachment' => $attachment,
            'sender_id'  => $this->sender_id,
            'is_mine'    => $this->sender_id === $viewerId,
            'sender'     => [
                'name'   => $this->sender->name,
                'avatar' => $this->sender->avatar,
            ],
            'read_at'    => $this->read_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
