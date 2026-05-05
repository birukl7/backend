<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CvEducation extends Model
{
    /** @use HasFactory<\Database\Factories\CvEducationFactory> */
    use HasFactory;

    protected $fillable = ['cv_id','institution_name','degree','field_of_study','location','description','start_date','end_date','is_current','sort_order'];
    protected $casts = ['is_current' => 'boolean'];
}
