<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CvExperience extends Model
{
    /** @use HasFactory<\Database\Factories\CvExperienceFactory> */
    use HasFactory;

        protected $fillable = ['cv_id','job_title','company_name','location','description','start_date','end_date','is_current','sort_order'];
    protected $casts = ['is_current' => 'boolean'];
}
