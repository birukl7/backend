<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CvSkill extends Model
{
    /** @use HasFactory<\Database\Factories\CvSkillFactory> */
    use HasFactory;
    protected $fillable = ['cv_id','skill_name','proficiency_level','category','sort_order'];
}
