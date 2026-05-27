<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    /** @use HasFactory<\Database\Factories\ApplicationFactory> */
    use HasFactory;

    protected $fillable = [
        'vacancy_id',
        'cv_id',
        'user_id',
        'cover_letter',
        'status',
    ];

    public function vacancy()
    {
        return $this->belongsTo(Vacancy::class);
    }

    public function cv()
    {
        return $this->belongsTo(Cv::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function interview()
    {
        return $this->hasOne(Interview::class);
    }

    public function screeningResponse()
    {
        return $this->hasOne(ScreeningResponse::class);
    }
}
