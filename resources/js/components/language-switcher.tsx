import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'am', label: 'አማርኛ' },
    { code: 'ti', label: 'ትግርኛ' },
    { code: 'om', label: 'Oromigna' },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]['code'];

interface Props {
    /** 'ghost' in light navbars, 'outline-dark' on the dark landing background */
    variant?: 'ghost' | 'outline-dark';
    className?: string;
}

export function LanguageSwitcher({ variant = 'ghost', className }: Props) {
    const { i18n, t } = useTranslation();
    const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

    const changeLanguage = (code: LanguageCode) => {
        i18n.changeLanguage(code);
        localStorage.setItem('app_language', code);
        document.documentElement.lang = code;
    };

    const isDark = variant === 'outline-dark';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('common.language')}
                    className={[
                        'gap-1.5 px-2 font-medium',
                        isDark
                            ? 'border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white'
                            : 'text-muted-foreground hover:text-foreground',
                        className,
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline text-[13px]">
                        {current.label}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={[
                            'cursor-pointer gap-2',
                            lang.code === current.code
                                ? 'font-semibold text-foreground'
                                : 'text-muted-foreground',
                        ].join(' ')}
                    >
                        {lang.label}
                        {lang.code === current.code && (
                            <span className="ms-auto text-xs opacity-60">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
