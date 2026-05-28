import { router } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

type Props = {
    user: User;
    maxBytes: number;
    maxLabel: string;
};

export default function ProfilePhotoUpload({ user, maxBytes, maxLabel }: Props) {
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    const displayUrl = localPreviewUrl ?? user.avatar ?? null;

    const uploadPhoto = (file: File) => {
        setClientError(null);

        if (file.size > maxBytes) {
            setClientError(
                `This image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum size is ${maxLabel}.`,
            );
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(objectUrl);

        router.post(
            '/settings/profile/photo',
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setUploading(true),
                onSuccess: () => {
                    URL.revokeObjectURL(objectUrl);
                    setLocalPreviewUrl(null);
                    setClientError(null);
                },
                onError: (errors) => {
                    URL.revokeObjectURL(objectUrl);
                    setLocalPreviewUrl(null);
                    const message =
                        typeof errors.photo === 'string'
                            ? errors.photo
                            : 'The photo could not be uploaded. Please try a smaller image.';
                    setClientError(message);
                },
                onFinish: () => setUploading(false),
            },
        );
    };

    const removePhoto = () => {
        setClientError(null);
        router.delete('/settings/profile/photo', {
            preserveScroll: true,
            onStart: () => setUploading(true),
            onFinish: () => setUploading(false),
            onSuccess: () => setLocalPreviewUrl(null),
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label="Upload profile photo"
                    disabled={uploading}
                >
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={displayUrl ?? undefined} alt={user.name} />
                        <AvatarFallback className="text-lg">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="h-5 w-5 text-white" />
                    </span>
                </button>

                <div className="space-y-2">
                    <p className="text-sm font-medium">Profile photo</p>
                    <p className="text-sm text-muted-foreground">
                        JPG, PNG, GIF or WebP. Max {maxLabel}.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {displayUrl ? 'Change photo' : 'Upload photo'}
                        </Button>
                        {(displayUrl || user.avatar) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={uploading}
                                onClick={removePhoto}
                            >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Remove
                            </Button>
                        )}
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                            uploadPhoto(file);
                        }
                        event.target.value = '';
                    }}
                />
            </div>

            <InputError message={clientError} />
        </div>
    );
}
