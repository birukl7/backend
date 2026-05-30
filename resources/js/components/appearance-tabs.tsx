import { Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground',
                className,
            )}
            {...props}
        >
            <Sun className="h-4 w-4 text-amber-500" />
            Light theme is enabled for all users.
        </div>
    );
}
