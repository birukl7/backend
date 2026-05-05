<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CvProject extends Model
{
    /** @use HasFactory<\Database\Factories\CvProjectFactory> */
    use HasFactory;

    protected $fillable = ['cv_id','project_name','description','url','tech_stack','start_date','end_date','sort_order'];
}
