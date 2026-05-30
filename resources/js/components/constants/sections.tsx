import { Badge } from '../ui/badge';

export const sections = [
    {
        id: 'hero',
        subtitle: (
            <Badge
                variant="outline"
                className="border-white/40 bg-white/5 text-white"
            >
                AI-powered hiring
            </Badge>
        ),
        title: 'Find the right job. Hire the right talent.',
        content:
            'SkillChain connects job seekers and employers with AI-driven matching and smart CV building.',
        showButton: true,
        buttonText: 'Get started',
    },

    {
        id: 'about',
        title: 'Why SkillChain?',
        content:
            'We simplify recruitment with AI-powered matching, reducing time, cost, and effort for both job seekers and employers.',
    },

    {
        id: 'features',
        title: 'What we offer',
        content:
            'Build professional CVs, get personalized job recommendations, automate candidate shortlisting, and schedule interviews seamlessly.',
    },

    {
        id: 'ai-matching',
        title: 'Smart AI matching',
        content:
            'Our AI analyzes skills, experience, and job requirements to recommend the best candidates and opportunities with high accuracy.',
    },

    {
        id: 'cv-builder',
        title: 'Dynamic CV builder',
        content:
            'Create multiple tailored CVs with structured sections like experience, education, and skills to match different job opportunities.',
    },

    {
        id: 'testimonials',
        title: 'Success stories',
        content:
            'Job seekers land better opportunities faster, while employers hire top talent efficiently using our intelligent system.',
    },

    {
        id: 'join',
        title: 'Start your journey',
        content:
            'Whether you are looking for a job or hiring talent, join SkillChain and experience the future of recruitment.',
        showButton: true,
        buttonText: 'Join now',
    },
];
