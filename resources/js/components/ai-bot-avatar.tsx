const BOT_AVATAR_SRC = '/images/bot-image.jpg';

const sizeClasses = {
    xs: 'h-6 w-6 rounded-full',
    sm: 'h-7 w-7 rounded-full',
    md: 'h-10 w-10 rounded-2xl',
    lg: 'h-12 w-12 rounded-2xl',
} as const;

type Size = keyof typeof sizeClasses;

interface AiBotAvatarProps {
    size?: Size;
    className?: string;
}

export default function AiBotAvatar({ size = 'sm', className = '' }: AiBotAvatarProps) {
    return (
        <img
            src={BOT_AVATAR_SRC}
            alt="AI assistant"
            className={`shrink-0 object-cover shadow-sm ${sizeClasses[size]} ${className}`.trim()}
        />
    );
}
