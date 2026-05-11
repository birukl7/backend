# AI Job-Résumé Matching Service

A lightweight FastAPI microservice that uses the
[`sentence-transformers/all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
open-source model to rank job vacancies by semantic similarity to a given
résumé.  It runs as a standalone Python process on **port 8001** and is
called by the Laravel backend over HTTP.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [Project structure](#project-structure)
4. [Configuration](#configuration)
5. [Starting the service](#starting-the-service)
6. [API reference](#api-reference)
7. [Laravel integration](#laravel-integration)
8. [Development notes](#development-notes)

---

## How it works

```
Résumé text ──┐
              ├─► SentenceTransformer.encode() ──► cosine similarity ──► sorted scores
Job texts   ──┘
```

1. Both the résumé and every vacancy's concatenated `title + description +
   requirements` are fed into the `all-MiniLM-L6-v2` model in a **single
   batched** call.
2. All embeddings are **L2-normalised**, so a dot-product equals cosine
   similarity (values in `[-1, 1]`, higher = more similar).
3. Results are returned **sorted by score descending** so the best match
   is always first.

The model is loaded **once at startup** and kept in memory, so subsequent
requests are fast (typically < 50 ms for 20 vacancies on a modern CPU).

---

## Prerequisites

| Requirement | Minimum version |
|-------------|----------------|
| Python      | **3.10**        |
| pip         | 23+             |

No GPU is required.  The model runs comfortably on CPU.

---

## Project structure

```
ai_service/
├── main.py            # FastAPI application (routes, schemas, CORS)
├── matcher.py         # AI matching logic (model load + compute_matches)
├── requirements.txt   # Python dependencies
├── .env               # Active environment variables (not committed)
├── .env.example       # Template – copy to .env
├── start.bat          # Windows launcher
├── start.sh           # Linux / macOS launcher
└── README.md          # This file
```

---

## Configuration

Copy `.env.example` to `.env` (already done) and edit as needed:

```F:\projects\backend\ai_service\.env.example#L1-10
# AI Matching Service – environment configuration
# Copy this file to .env and adjust values for your environment.

# Host and port the service listens on
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8001

# Comma-separated list of origins allowed to call this service (CORS).
# Add your Laravel application's origin here.
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

| Variable          | Default                                         | Description                              |
|-------------------|-------------------------------------------------|------------------------------------------|
| `AI_SERVICE_HOST` | `0.0.0.0`                                       | Bind address                             |
| `AI_SERVICE_PORT` | `8001`                                          | Port number                              |
| `ALLOWED_ORIGINS` | `http://localhost:8000,http://127.0.0.1:8000`   | Comma-separated CORS-allowed origins     |

---

## Starting the service

### Windows

Double-click `start.bat` **or** run from a terminal:

```F:\projects\backend\ai_service\start.bat#L1-5
@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

```

```
cd ai_service
start.bat
```

The script will:
1. Create a `venv/` virtual environment if one does not exist.
2. Install / upgrade all dependencies from `requirements.txt`.
3. Launch `uvicorn` with `--reload` (auto-restart on file changes).

### Linux / macOS

```
cd ai_service
chmod +x start.sh
./start.sh
```

### Manual (any platform)

```
cd ai_service
python -m venv venv
# Windows:  venv\Scripts\activate
# Unix:     source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Once started you should see:

```
INFO  … Model ready.  Service accepting requests.
INFO  … Application startup complete.
INFO  … Uvicorn running on http://0.0.0.0:8001
```

The interactive API docs are available at:  
`http://localhost:8001/docs` (Swagger UI)  
`http://localhost:8001/redoc` (ReDoc)

---

## API reference

### `GET /health`

Liveness probe – confirms the service is up and which model is active.

**Response `200 OK`**

```F:\projects\backend\ai_service\main.py#L156-159
@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness probe",
```

```
GET http://localhost:8001/health
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "model": "all-MiniLM-L6-v2"
}
```

---

### `POST /match`

Scores a résumé against a list of vacancies.

**Request body**

| Field         | Type            | Required | Description                                   |
|---------------|-----------------|----------|-----------------------------------------------|
| `resume_text` | `string`        | Yes      | Plain-text content of the applicant's résumé  |
| `vacancies`   | `array[object]` | Yes      | One or more vacancy objects (see below)       |

**Vacancy object**

| Field          | Type            | Required | Description                  |
|----------------|-----------------|----------|------------------------------|
| `id`           | `integer/string`| Yes      | Unique vacancy identifier    |
| `title`        | `string`        | Yes      | Job title                    |
| `description`  | `string`        | Yes      | Full job description         |
| `requirements` | `string/null`   | No       | Skills / requirements text   |

**Example request**

```
POST http://localhost:8001/match
Content-Type: application/json

{
  "resume_text": "Experienced PHP developer with 5 years using Laravel, REST APIs, MySQL, and Vue.js. Strong background in TDD and CI/CD pipelines.",
  "vacancies": [
    {
      "id": 1,
      "title": "Senior PHP / Laravel Developer",
      "description": "Join our team to build scalable REST APIs and web applications using Laravel and MySQL.",
      "requirements": "5+ years PHP, Laravel, MySQL, REST, Git"
    },
    {
      "id": 2,
      "title": "Data Scientist",
      "description": "Analyse large datasets using Python, pandas and scikit-learn to produce actionable insights.",
      "requirements": "Python, pandas, scikit-learn, SQL, statistics"
    },
    {
      "id": 3,
      "title": "Frontend Developer",
      "description": "Build modern UIs with Vue.js and TypeScript, collaborating closely with the backend team.",
      "requirements": "Vue.js, TypeScript, CSS, REST API consumption"
    }
  ]
}
```

**Example response `200 OK`**

```
{
  "matches": [
    { "vacancy_id": 1, "score": 0.8731 },
    { "vacancy_id": 3, "score": 0.6204 },
    { "vacancy_id": 2, "score": 0.3017 }
  ]
}
```

Results are **always sorted by `score` descending**.  A score near `1.0`
indicates high semantic similarity; near `0.0` indicates little overlap.

**Error responses**

| Status | Meaning                                           |
|--------|---------------------------------------------------|
| `422`  | Validation error – malformed or missing fields    |
| `500`  | Internal server error – check service logs        |

---

## Laravel integration

### 1. Add the service URL to your `.env`

```
AI_SERVICE_URL=http://127.0.0.1:8001
```

### 2. Create a dedicated service class

```php
// app/Services/AiMatchingService.php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiMatchingService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.ai_matching.url'), '/');
    }

    /**
     * @param  string  $resumeText   Plain-text résumé content
     * @param  array   $vacancies    Array of vacancy arrays (id, title, description, requirements)
     * @return array                 Sorted array of ['vacancy_id' => …, 'score' => …]
     */
    public function match(string $resumeText, array $vacancies): array
    {
        try {
            $response = Http::timeout(30)->post("{$this->baseUrl}/match", [
                'resume_text' => $resumeText,
                'vacancies'   => $vacancies,
            ]);

            if ($response->successful()) {
                return $response->json('matches', []);
            }

            Log::error('AI service error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
        } catch (\Exception $e) {
            Log::error('AI service unreachable: ' . $e->getMessage());
        }

        return [];
    }

    public function isHealthy(): bool
    {
        try {
            return Http::timeout(5)
                ->get("{$this->baseUrl}/health")
                ->successful();
        } catch (\Exception) {
            return false;
        }
    }
}
```

### 3. Register in `config/services.php`

```php
'ai_matching' => [
    'url' => env('AI_SERVICE_URL', 'http://127.0.0.1:8001'),
],
```

### 4. Usage in a controller or job

```php
use App\Services\AiMatchingService;

class ApplicationController extends Controller
{
    public function __construct(private AiMatchingService $ai) {}

    public function rank(Request $request, int $resumeId)
    {
        $resume    = Resume::findOrFail($resumeId);
        $vacancies = Vacancy::all(['id', 'title', 'description', 'requirements'])
                            ->toArray();

        $matches = $this->ai->match($resume->plain_text, $vacancies);

        return response()->json(['matches' => $matches]);
    }
}
```

---

## Development notes

- **Model cache** – `sentence-transformers` caches downloaded model weights in
  `~/.cache/huggingface/hub/` on first run.  Subsequent starts are instant.
- **Concurrency** – `uvicorn` with the default single worker handles typical
  workloads.  For high-throughput production use, increase workers:
  `uvicorn main:app --workers 4 --host 0.0.0.0 --port 8001`
- **--reload flag** – the `start.bat` / `start.sh` scripts use `--reload` for
  development convenience.  Remove it in production.
- **GPU acceleration** – install `torch` with CUDA support and
  `sentence-transformers` will use the GPU automatically with no code changes.
