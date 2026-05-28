import { getAppLogoUrl } from '@/lib/brand-assets';

export default function AppLogo({ compact = false }: { compact?: boolean }) {
    return (
        <>
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
                <img
                    src={getAppLogoUrl()}
                    alt="SkillChain"
                    className="max-h-full max-w-full object-contain"
                />
            </div>
            {!compact && (
                <div className="ml-2 grid min-w-0 flex-1 text-left text-sm">
                    <span className="truncate leading-tight font-semibold">
                        SkillChain
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                        Job Matching
                    </span>
                </div>
            )}
        </>
    );
}
