import { Link } from '@inertiajs/react';
import { getAppLogoUrl } from '@/lib/brand-assets';
import { home } from '@/routes';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
    className?: string;
    imageClassName?: string;
    showName?: boolean;
    linkToHome?: boolean;
};

export function BrandLogo({
    className,
    imageClassName = 'h-10 w-auto max-w-[140px] object-contain',
    showName = true,
    linkToHome = true,
}: BrandLogoProps) {
    const content = (
        <>
            <img
                src={getAppLogoUrl()}
                alt="SkillChain"
                className={imageClassName}
            />
            {showName && (
                <span className="text-lg font-semibold tracking-tight">
                    SkillChain
                </span>
            )}
        </>
    );

    const wrapperClass = cn('inline-flex items-center gap-2', className);

    if (linkToHome) {
        return (
            <Link href={home()} className={wrapperClass}>
                {content}
            </Link>
        );
    }

    return <div className={wrapperClass}>{content}</div>;
}
