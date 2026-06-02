# Database Schema

This document summarizes the current database tables and attributes based on the Laravel migration files in `database/migrations/`.

---

## users

- `id` (PK)
- `name`
- `email` (unique)
- `google_id` (nullable, unique)
- `google_calendar_access_token` (nullable, text)
- `google_calendar_refresh_token` (nullable, text)
- `google_calendar_token_expires_at` (nullable)
- `email_verified_at` (nullable)
- `password` (nullable — OAuth users may have no password)
- `two_factor_secret` (nullable, text)
- `two_factor_recovery_codes` (nullable, text)
- `two_factor_confirmed_at` (nullable)
- `remember_token` (nullable)
- `is_flagged_suspicious` BOOLEAN (default `false`)
- `account_status` (default `active`)
- `security_notes` (nullable, text)
- `security_flagged_at` (nullable)
- `security_flagged_by` (nullable, FK → `users.id`, ON DELETE SET NULL)
- `status_changed_at` (nullable)
- `headline` (nullable)
- `bio` (nullable, text)
- `profile_photo` (nullable)
- `experience_years` (nullable)
- `location` (nullable)
- `company_name` (nullable)
- `company_description` (nullable)
- `company_website` (nullable)
- `company_logo` (nullable)
- `employer_type` (nullable)
- `national_id` (nullable)
- `employer_verification_status` (default `pending`)
- `employer_submitted_at` (nullable)
- `employer_verified_at` (nullable)
- `employer_verified_by` (nullable — no FK constraint in migration)
- `employer_verification_notes` (nullable, text)
- `company_tin_number` (nullable)
- `company_phone` (nullable)
- `company_contact_email` (nullable)
- `company_verification_status` (default `pending`)
- `business_license_status` (default `pending`)
- `business_license_path` (nullable)
- `kyc_verified` BOOLEAN (default `false`)
- `tin_verified` BOOLEAN (default `false`)
- `company_info_verified` BOOLEAN (default `false`)
- `company_verification_notes` (nullable, text)
- `company_submitted_at` (nullable)
- `company_verified_at` (nullable)
- `company_verified_by` (nullable — no FK constraint in migration)
- `created_at`
- `updated_at`

> Job seeker, employer, and admin profile fields are stored on the `users` table. Roles are assigned via Spatie Permission (`roles`, `model_has_roles`).

---

## cvs

- `id` (PK)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `source` (default `builder`) — `builder` or `upload`
- `title`
- `is_default` BOOLEAN (default `false`)
- `full_name` (nullable)
- `email` (nullable)
- `phone` (nullable)
- `location` (nullable)
- `website` (nullable)
- `linkedin` (nullable)
- `github` (nullable)
- `photo_path` (nullable)
- `file_path` (nullable)
- `original_filename` (nullable)
- `mime_type` (nullable)
- `extracted_text` (nullable, text)
- `extracted_at` (nullable)
- `summary` (nullable, text)
- `summary_approval_status` (default `approved`)
- `summary_moderation_notes` (nullable, text)
- `summary_moderated_at` (nullable)
- `summary_moderated_by` (nullable, FK → `users.id`, ON DELETE SET NULL)
- `ai_summary` (nullable, text)
- `ai_suggestions` JSON (nullable)
- `ai_improvements` JSON (nullable)
- `ai_strength_score` (nullable, unsigned tinyint)
- `ai_summary_generated_at` (nullable)
- `template` (default `classic`) — `classic`, `modern`, or `minimal`
- `accent_color` (default `#2563eb`)
- `section_order` JSON (nullable)
- `created_at`
- `updated_at`

---

## cv_experiences

- `id` (PK)
- `cv_id` (FK → `cvs.id`, ON DELETE CASCADE)
- `job_title`
- `company_name`
- `location` (nullable)
- `description` (nullable, text)
- `start_date` DATE
- `end_date` DATE (nullable)
- `is_current` BOOLEAN (default `false`)
- `sort_order` (default `0`)
- `created_at`
- `updated_at`

---

## cv_education

- `id` (PK)
- `cv_id` (FK → `cvs.id`, ON DELETE CASCADE)
- `institution_name`
- `degree`
- `field_of_study`
- `location` (nullable)
- `description` (nullable, text)
- `start_date` DATE
- `end_date` DATE (nullable)
- `is_current` BOOLEAN (default `false`)
- `sort_order` (default `0`)
- `created_at`
- `updated_at`

---

## cv_skills

- `id` (PK)
- `cv_id` (FK → `cvs.id`, ON DELETE CASCADE)
- `skill_name`
- `proficiency_level` ENUM(`beginner`, `intermediate`, `advanced`, `expert`, default `intermediate`)
- `category` (nullable)
- `sort_order` (default `0`)
- `created_at`
- `updated_at`

---

## cv_projects

- `id` (PK)
- `cv_id` (FK → `cvs.id`, ON DELETE CASCADE)
- `project_name`
- `description` (nullable, text)
- `url` (nullable)
- `tech_stack` (nullable)
- `start_date` DATE (nullable)
- `end_date` DATE (nullable)
- `sort_order` (default `0`)
- `created_at`
- `updated_at`

---

## vacancies

- `id` (PK)
- `user_id` (FK → `users.id`, ON DELETE CASCADE) — employer
- `title`
- `description` (text)
- `requirements` (nullable)
- `tags` JSON (nullable)
- `location` (nullable)
- `salary_min` DECIMAL(10,2) (nullable)
- `salary_max` DECIMAL(10,2) (nullable)
- `employment_type` ENUM(`full_time`, `part_time`, `contract`, `temporary`, `internship`, default `full_time`)
- `status` ENUM(`open`, `closed`, default `open`)
- `moderation_status` (default `approved`)
- `is_archived` BOOLEAN (default `false`)
- `is_flagged_suspicious` BOOLEAN (default `false`)
- `moderation_notes` (nullable, text)
- `moderated_at` (nullable)
- `moderated_by` (nullable, FK → `users.id`, ON DELETE SET NULL)
- `work_type` ENUM(`remote`, `on_site`, `hybrid`, default `on_site`)
- `application_deadline` DATE (nullable)
- `created_at`
- `updated_at`

---

## applications

- `id` (PK)
- `vacancy_id` (FK → `vacancies.id`, ON DELETE CASCADE)
- `cv_id` (FK → `cvs.id`, ON DELETE CASCADE)
- `user_id` (FK → `users.id`, ON DELETE CASCADE) — job seeker
- `cover_letter` (nullable, text)
- `status` ENUM(`pending`, `applied`, `shortlisted`, `rejected`, `hired`, default `pending`)
- `created_at`
- `updated_at`

> Unique constraint: `(vacancy_id, user_id)`

---

## ai_matches

- `id` (PK)
- `vacancy_id` (FK → `vacancies.id`, ON DELETE CASCADE)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `match_score` FLOAT (default `0`)
- `created_at`
- `updated_at`

---

## shortlists

- `id` (PK)
- `vacancy_id` (FK → `vacancies.id`, ON DELETE CASCADE)
- `user_id` (FK → `users.id`, ON DELETE CASCADE) — job seeker
- `created_at`
- `updated_at`

> Unique constraint: `(user_id, vacancy_id)`

---

## interviews

- `id` (PK)
- `application_id` (FK → `applications.id`, ON DELETE CASCADE)
- `job_seeker_id` (FK → `users.id`, ON DELETE CASCADE)
- `employer_id` (FK → `users.id`, ON DELETE CASCADE)
- `scheduled_at`
- `rescheduled_at` (nullable)
- `room_id` (unique)
- `meeting_link`
- `notes` (nullable, text)
- `timezone` (default `UTC`)
- `status` ENUM(`scheduled`, `completed`, `cancelled`, default `scheduled`)
- `seeker_calendar_event_id` (nullable)
- `employer_calendar_event_id` (nullable)
- `created_at`
- `updated_at`

---

## hire_reviews

- `id` (PK)
- `application_id` (FK → `applications.id`, ON DELETE CASCADE)
- `reviewer_id` (FK → `users.id`, ON DELETE CASCADE)
- `reviewee_id` (FK → `users.id`, ON DELETE CASCADE)
- `rating` (unsigned tinyint)
- `comment` (nullable, text)
- `created_at`
- `updated_at`

> Unique constraint: `(application_id, reviewer_id)`

---

## job_screenings

- `id` (PK)
- `vacancy_id` (FK → `vacancies.id`, ON DELETE CASCADE)
- `is_enabled` BOOLEAN (default `false`)
- `intro_message` (nullable, text)
- `criteria` JSON (nullable)
- `questions` JSON (nullable)
- `passing_score` (unsigned tinyint, default `60`)
- `auto_reject_below` (unsigned tinyint, nullable)
- `created_at`
- `updated_at`

---

## screening_responses

- `id` (PK)
- `vacancy_id` (FK → `vacancies.id`, ON DELETE CASCADE)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `application_id` (nullable, FK → `applications.id`, ON DELETE SET NULL)
- `transcript` JSON (nullable)
- `answers` JSON (nullable)
- `ai_score` (unsigned tinyint, nullable)
- `ai_summary` (nullable, text)
- `ai_strengths` JSON (nullable)
- `ai_concerns` JSON (nullable)
- `recommendation` (nullable) — e.g. `strong_match`, `good_match`, `weak_match`, `not_recommended`
- `status` (default `in_progress`) — `in_progress`, `completed`, or `abandoned`
- `completed_at` (nullable)
- `created_at`
- `updated_at`

---

## conversations

- `id` (PK)
- `employer_id` (FK → `users.id`, ON DELETE CASCADE)
- `job_seeker_id` (FK → `users.id`, ON DELETE CASCADE)
- `vacancy_id` (nullable, FK → `vacancies.id`, ON DELETE SET NULL)
- `status` ENUM(`active`, `closed`, default `active`)
- `created_at`
- `updated_at`

> Unique constraint: `(employer_id, job_seeker_id, vacancy_id)`

---

## messages

- `id` (PK)
- `conversation_id` (FK → `conversations.id`, ON DELETE CASCADE)
- `sender_id` (FK → `users.id`, ON DELETE CASCADE)
- `body` (text)
- `read_at` (nullable)
- `created_at`
- `updated_at`

> Index: `(conversation_id, created_at)`

---

## notifications

- `id` (PK)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `type` — e.g. `new_message`, `application_status`, `interview_scheduled`
- `title`
- `body` (text)
- `data` JSON (nullable)
- `read_at` (nullable)
- `created_at`
- `updated_at`

> Used by the `AppNotification` Eloquent model.

---

## assessments

- `id` (PK)
- `user_id` (nullable, FK → `users.id`, ON DELETE CASCADE) — NULL = global quiz
- `title`
- `skill_name`
- `category` (default `general`)
- `difficulty` ENUM(`beginner`, `intermediate`, `advanced`, default `beginner`)
- `time_limit_minutes` (default `10`)
- `pass_score` (default `70`) — percentage 0–100
- `is_active` BOOLEAN (default `true`)
- `is_ai_generated` BOOLEAN (default `false`)
- `approval_status` (default `approved`)
- `content_moderation_notes` (nullable, text)
- `content_moderated_at` (nullable)
- `content_moderated_by` (nullable, FK → `users.id`, ON DELETE SET NULL)
- `description` (nullable, text)
- `created_at`
- `updated_at`

---

## quiz_questions

- `id` (PK)
- `assessment_id` (FK → `assessments.id`, ON DELETE CASCADE)
- `question` (text)
- `explanation` (nullable, text)
- `sort_order` (default `0`)
- `created_at`
- `updated_at`

---

## quiz_options

- `id` (PK)
- `question_id` (FK → `quiz_questions.id`, ON DELETE CASCADE)
- `option_text`
- `is_correct` BOOLEAN (default `false`)
- `sort_order` (default `0`)
- `created_at`
- `updated_at`

---

## assessment_results

- `id` (PK)
- `assessment_id` (FK → `assessments.id`, ON DELETE CASCADE)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `score` FLOAT (default `0`)
- `level` ENUM(`beginner`, `intermediate`, `advanced`, default `beginner`)
- `passed` BOOLEAN (default `false`)
- `time_taken_seconds` (nullable)
- `total_questions` (default `0`)
- `correct_answers` (default `0`)
- `created_at`
- `updated_at`

---

## skill_reports

- `id` (PK)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `assessment_result_id` (FK → `assessment_results.id`, ON DELETE CASCADE)
- `report_data` JSON
- `created_at`
- `updated_at`

---

## job_recommendations

- `id` (PK)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `vacancy_id` (FK → `vacancies.id`, ON DELETE CASCADE)
- `match_score` FLOAT (default `0`)
- `created_at`
- `updated_at`

---

## job_search_logs

- `id` (PK)
- `user_id` (FK → `users.id`, ON DELETE CASCADE)
- `search_query`
- `filters` JSON (nullable)
- `searched_at`
- `created_at`
- `updated_at`

---

## reports

- `id` (PK)
- `generated_by` (FK → `users.id`, ON DELETE CASCADE)
- `report_type`
- `report_data` JSON
- `created_at`
- `updated_at`

---

## permissions

*(Spatie Laravel Permission)*

- `id` (PK)
- `name`
- `guard_name`
- `created_at`
- `updated_at`

> Unique constraint: `(name, guard_name)`

---

## roles

- `id` (PK)
- `name`
- `guard_name`
- `created_at`
- `updated_at`

> Unique constraint: `(name, guard_name)`

---

## model_has_permissions

- `permission_id` (FK → `permissions.id`, ON DELETE CASCADE)
- `model_type`
- `model_id`

> Primary key: `(permission_id, model_id, model_type)`

---

## model_has_roles

- `role_id` (FK → `roles.id`, ON DELETE CASCADE)
- `model_type`
- `model_id`

> Primary key: `(role_id, model_id, model_type)`

---

## role_has_permissions

- `permission_id` (FK → `permissions.id`, ON DELETE CASCADE)
- `role_id` (FK → `roles.id`, ON DELETE CASCADE)

> Primary key: `(permission_id, role_id)`

---

## Framework & infrastructure tables

These tables are created by Laravel and package migrations and are not part of the core job-board domain model.

### password_reset_tokens

- `email` (PK)
- `token`
- `created_at` (nullable)

### sessions

- `id` (PK)
- `user_id` (nullable, indexed)
- `ip_address` (nullable)
- `user_agent` (nullable, text)
- `payload` (longtext)
- `last_activity` (indexed)

### personal_access_tokens

- `id` (PK)
- `tokenable_type`
- `tokenable_id`
- `name` (text)
- `token` (unique)
- `abilities` (nullable, text)
- `last_used_at` (nullable)
- `expires_at` (nullable, indexed)
- `created_at`
- `updated_at`

### cache

- `key` (PK)
- `value` (mediumtext)
- `expiration` (indexed)

### cache_locks

- `key` (PK)
- `owner`
- `expiration` (indexed)

### jobs

*(Laravel queue — not job listings)*

- `id` (PK)
- `queue` (indexed)
- `payload` (longtext)
- `attempts`
- `reserved_at` (nullable)
- `available_at`
- `created_at`

### job_batches

- `id` (PK)
- `name`
- `total_jobs`
- `pending_jobs`
- `failed_jobs`
- `failed_job_ids` (longtext)
- `options` (nullable, mediumtext)
- `cancelled_at` (nullable)
- `created_at`
- `finished_at` (nullable)

### failed_jobs

- `id` (PK)
- `uuid` (unique)
- `connection` (text)
- `queue` (text)
- `payload` (longtext)
- `exception` (longtext)
- `failed_at`

---

## Enum summary

| Table | Column | Values |
|-------|--------|--------|
| `cv_skills` | `proficiency_level` | `beginner`, `intermediate`, `advanced`, `expert` |
| `vacancies` | `employment_type` | `full_time`, `part_time`, `contract`, `temporary`, `internship` |
| `vacancies` | `status` | `open`, `closed` |
| `vacancies` | `work_type` | `remote`, `on_site`, `hybrid` |
| `applications` | `status` | `pending`, `applied`, `shortlisted`, `rejected`, `hired` |
| `interviews` | `status` | `scheduled`, `completed`, `cancelled` |
| `conversations` | `status` | `active`, `closed` |
| `assessments` | `difficulty` | `beginner`, `intermediate`, `advanced` |
| `assessment_results` | `level` | `beginner`, `intermediate`, `advanced` |
