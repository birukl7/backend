# Backend Service

## Overview

This repository contains a Laravel application plus a separate Python-based AI matching service located in `ai_service/`.

## Laravel Setup

1. Copy the `.env.example` file to `.env`
2. Install PHP dependencies:
    - `composer install`
3. Generate the application key:
    - `php artisan key:generate`
4. Configure the database in `.env`
5. Add the AI matching service URL to `.env`:
    - `AI_MATCHING_URL=http://localhost:8001`

## AI Matching Service

The AI matching service runs separately in `ai_service/`.

### Starting the service

- On Windows: run `ai_service\start.bat`
- On macOS/Linux: run `./ai_service/start.sh`

### Notes

- The AI service should be running on `http://localhost:8001`
- Ensure the Laravel `.env` value `AI_MATCHING_URL` matches the service URL

## Running Laravel

1. Start the Laravel server:
    - `php artisan serve`
2. The app will typically run on `http://127.0.0.1:8000`

## Summary

- Laravel app: configure `.env`, install dependencies, start with `php artisan serve`
- AI matching service: start with `ai_service\start.bat` or `./ai_service/start.sh`
- Set `AI_MATCHING_URL=http://localhost:8001` in Laravel `.env`
