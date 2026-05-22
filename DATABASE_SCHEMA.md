# Database Schema

This document summarizes the current database tables and attributes based on the existing Laravel migration files.

## users
- `id` (PK)
- `name`
- `email` (unique)
- `password`
- `email_verified_at`
- `remember_token`
- `headline` (nullable)
- `bio` (nullable)
- `profile_photo` (nullable)
- `experience_years` (nullable)
- `location` (nullable)
- `company_name` (nullable)
- `company_description` (nullable)
- `company_website` (nullable)
- `company_logo` (nullable)
- `created_at`
- `updated_at`

> Job seeker and employer profile fields are stored directly on the `users` table.

## cvs
- `id` (PK)
- `user_id` (FK -> `users.id`)
- `title`
- `is_default` BOOLEAN
- `full_name` (nullable)
- `email` (nullable)
- `phone` (nullable)
- `location` (nullable)
- `website` (nullable)
- `linkedin` (nullable)
- `github` (nullable)
- `summary` (nullable)
- `template` (`classic` default)
- `accent_color`
- `section_order` JSON (nullable)
- `created_at`
- `updated_at`

## cv_experiences
- `id` (PK)
- `cv_id` (FK -> `cvs.id`)
- `job_title`
- `company_name`
- `location` (nullable)
- `description` (nullable)
- `start_date`
- `end_date` (nullable)
- `is_current` BOOLEAN
- `sort_order`
- `created_at`
- `updated_at`

## cv_education
- `id` (PK)
- `cv_id` (FK -> `cvs.id`)
- `institution_name`
- `degree`
- `field_of_study`
- `location` (nullable)
- `description` (nullable)
- `start_date`
- `end_date` (nullable)
- `is_current` BOOLEAN
- `sort_order`
- `created_at`
- `updated_at`

## cv_skills
- `id` (PK)
- `cv_id` (FK -> `cvs.id`)
- `skill_name`
- `proficiency_level` ENUM(`beginner`, `intermediate`, `advanced`, `expert`)
- `category` (nullable)
- `sort_order`
- `created_at`
- `updated_at`

## cv_projects
- `id` (PK)
- `cv_id` (FK -> `cvs.id`)
- `project_name`
- `description` (nullable)
- `url` (nullable)
- `tech_stack` (nullable)
- `start_date` (nullable)
- `end_date` (nullable)
- `sort_order`
- `created_at`
- `updated_at`

## vacancies
- `id` (PK)
- `user_id` (FK -> `users.id`) — employer
- `title`
- `description`
- `requirements` (nullable)
- `location` (nullable)
- `salary_min` DECIMAL(10,2) (nullable)
- `salary_max` DECIMAL(10,2) (nullable)
- `employment_type` ENUM(`full_time`, `part_time`, `contract`, `temporary`, `internship`)
- `status` ENUM(`open`, `closed`)
- `work_type` ENUM(`remote`, `on_site`, `hybrid`)
- `application_deadline` DATE (nullable)
- `created_at`
- `updated_at`

## applications
- `id` (PK)
- `vacancy_id` (FK -> `vacancies.id`)
- `cv_id` (FK -> `cvs.id`)
- `user_id` (FK -> `users.id`) — job seeker
- `cover_letter` (nullable)
- `status` ENUM(`pending`, `applied`, `shortlisted`, `rejected`, `hired`)
- `created_at`
- `updated_at`

> Unique constraint: `vacancy_id` + `user_id`

## ai_matches
- `id` (PK)
- `vacancy_id` (FK -> `vacancies.id`)
- `user_id` (FK -> `users.id`)
- `match_score` FLOAT
- `created_at`
- `updated_at`

## shortlists
- `id` (PK)
- `vacancy_id` (FK -> `vacancies.id`)
- `user_id` (FK -> `users.id`)
- `created_at`
- `updated_at`

> Migration does not store a separate `added_by`; only candidate and vacancy are recorded.

## interviews
- `id` (PK)
- `application_id` (FK -> `applications.id`)
- `job_seeker_id` (FK -> `users.id`)
- `employer_id` (FK -> `users.id`)
- `scheduled_at`
- `rescheduled_at` (nullable)
- `room_id` (unique)
- `meeting_link`
- `notes` (nullable)
- `timezone`
- `status` ENUM(`scheduled`, `completed`, `cancelled`)
- `created_at`
- `updated_at`

## assessments
- `id` (PK)
- `title`
- `description` (nullable)
- `created_at`
- `updated_at`

## assessment_results
- `id` (PK)
- `assessment_id` (FK -> `assessments.id`)
- `user_id` (FK -> `users.id`)
- `score` FLOAT
- `level` ENUM(`beginner`, `intermediate`, `advanced`)
- `created_at`
- `updated_at`

## skill_reports
- `id` (PK)
- `user_id` (FK -> `users.id`)
- `assessment_result_id` (FK -> `assessment_results.id`)
- `report_data` JSON
- `created_at`
- `updated_at`

## job_recommendations
- `id` (PK)
- `user_id` (FK -> `users.id`)
- `vacancy_id` (FK -> `vacancies.id`)
- `match_score` FLOAT
- `created_at`
- `updated_at`

## job_search_logs
- `id` (PK)
- `user_id` (FK -> `users.id`)
- `search_query`
- `filters` JSON (nullable)
- `searched_at`
- `created_at`
- `updated_at`

## reports
- `id` (PK)
- `generated_by` (FK -> `users.id`)
- `report_type`
- `report_data` JSON
- `created_at`
- `updated_at`
