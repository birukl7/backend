import {
    ChevronLeft,
    ChevronRight,
    Download,
    X,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ChatViewerImage = {
    url: string;
    name: string;
};

type ChatImageViewerProps = {
    images: ChatViewerImage[];
    index: number | null;
    onClose: () => void;
    onIndexChange: (index: number) => void;
};

export function ChatImageViewer({
    images,
    index,
    onClose,
    onIndexChange,
}: ChatImageViewerProps) {
    const open = index !== null && images.length > 0;
    const current = open && index !== null ? images[index] : null;
    const hasMultiple = images.length > 1;

    const goPrev = useCallback(() => {
        if (index === null || images.length === 0) return;
        onIndexChange((index - 1 + images.length) % images.length);
    }, [index, images.length, onIndexChange]);

    const goNext = useCallback(() => {
        if (index === null || images.length === 0) return;
        onIndexChange((index + 1) % images.length);
    }, [index, images.length, onIndexChange]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goNext();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, goPrev, goNext]);

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
        >
            <DialogContent
                showCloseButton={false}
                className={cn(
                    'flex max-h-[96vh] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden border-0 bg-slate-950/95 p-0 shadow-2xl sm:max-w-[min(96vw,1200px)]',
                )}
            >
                <DialogTitle className="sr-only">
                    {current ? `Image: ${current.name}` : 'Image viewer'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    View chat image attachment. Use arrow keys to navigate between
                    images.
                </DialogDescription>

                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <p className="min-w-0 truncate text-sm font-medium text-white/90">
                        {current?.name}
                        {hasMultiple && index !== null && (
                            <span className="ml-2 text-white/50">
                                {index + 1} / {images.length}
                            </span>
                        )}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                        {current && (
                            <a
                                href={current.url}
                                download={current.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                aria-label="Download image"
                            >
                                <Download className="h-4 w-4" />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Close image viewer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="relative flex min-h-[200px] flex-1 items-center justify-center p-4 sm:p-6">
                    {hasMultiple && (
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70 sm:left-4"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}

                    {current && (
                        <img
                            src={current.url}
                            alt={current.name}
                            className="max-h-[calc(96vh-8rem)] max-w-full object-contain"
                        />
                    )}

                    {hasMultiple && (
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70 sm:right-4"
                            aria-label="Next image"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
