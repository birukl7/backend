<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }
        </style>

        <title inertia>{{ config('app.name', 'SkillChain') }}</title>

        @php
            $faviconPath = public_path('favicon.png');
            $faviconVersion = is_file($faviconPath) ? filemtime($faviconPath) : time();
            $appleTouchPath = public_path('apple-touch-icon.png');
            $appleTouchVersion = is_file($appleTouchPath) ? filemtime($appleTouchPath) : $faviconVersion;
        @endphp
        <link rel="icon" href="{{ asset('favicon.png') }}?v={{ $faviconVersion }}" type="image/png" sizes="any">
        <link rel="shortcut icon" href="{{ asset('favicon.png') }}?v={{ $faviconVersion }}" type="image/png">
        <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}?v={{ $appleTouchVersion }}">
        <meta name="app-logo" content="{{ asset('favicon.png') }}?v={{ $faviconVersion }}">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
