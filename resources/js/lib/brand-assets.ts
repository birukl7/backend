/**
 * Brand logo URL — same file as favicon (public/favicon.png).
 * Cache-busting version comes from the app-logo meta tag in app.blade.php.
 */
export function getAppLogoUrl(): string {
    if (typeof document === 'undefined') {
        return '/favicon.png';
    }

    return (
        document
            .querySelector('meta[name="app-logo"]')
            ?.getAttribute('content') ?? '/favicon.png'
    );
}
