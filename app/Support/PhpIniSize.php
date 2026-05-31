<?php

namespace App\Support;

final class PhpIniSize
{
    /**
     * Parse a php.ini size value (e.g. "2M", "512K") into bytes.
     */
    public static function toBytes(string $value): int
    {
        $value = trim($value);

        if ($value === '') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return (int) match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => (float) $value,
        };
    }

    /**
     * Effective upload limit in kilobytes for Laravel's max rule.
     */
    public static function uploadMaxKilobytes(): int
    {
        $bytes = min(
            self::toBytes((string) ini_get('upload_max_filesize')),
            self::toBytes((string) ini_get('post_max_size')),
        );

        if ($bytes <= 0) {
            return 2048;
        }

        return max(1, (int) floor($bytes / 1024));
    }

    public static function uploadMaxLabel(): string
    {
        $kb = self::uploadMaxKilobytes();

        if ($kb >= 1024) {
            return round($kb / 1024, 1).' MB';
        }

        return $kb.' KB';
    }
}
