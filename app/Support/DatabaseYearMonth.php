<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class DatabaseYearMonth
{
    /**
     * SQL expression that formats created_at as YYYY-MM for GROUP BY (MySQL, PostgreSQL, SQLite).
     */
    public static function expression(string $column = 'created_at'): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => sprintf('strftime("%%Y-%%m", %s)', $column),
            'pgsql' => sprintf("to_char(%s, 'YYYY-MM')", $column),
            default => sprintf("DATE_FORMAT(%s, '%%Y-%%m')", $column),
        };
    }
}
