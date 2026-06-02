<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

final class PublicUploads
{
    public static function diskName(): string
    {
        return (string) config('filesystems.public_uploads_disk', 'public');
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::diskName());
    }

    public static function store(UploadedFile $file, string $directory): string
    {
        return $file->store($directory, self::diskName());
    }

    public static function put(string $path, string $contents): bool
    {
        return self::disk()->put($path, $contents);
    }

    public static function delete(?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        self::disk()->delete($path);
    }

    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return self::disk()->url($path);
    }

    public static function usesLocalDisk(): bool
    {
        return config('filesystems.disks.'.self::diskName().'.driver') === 'local';
    }
}
