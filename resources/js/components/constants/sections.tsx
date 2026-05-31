export interface SectionMeta {
    id: string;
    showButton?: boolean;
}

export const sections: SectionMeta[] = [
    { id: 'hero', showButton: true },
    { id: 'about' },
    { id: 'features' },
    { id: 'aiMatching' },
    { id: 'cvBuilder' },
    { id: 'testimonials' },
    { id: 'join', showButton: true },
];
