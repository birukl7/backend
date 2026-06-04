function withQuery(
    path: string,
    params?: Record<string, string | number | undefined>,
): string {
    if (!params) {
        return path;
    }

    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
            search.set(key, String(value));
        }
    }

    const query = search.toString();

    return query ? `${path}?${query}` : path;
}

export function adminDashboardPath(): string {
    return '/admin/dashboard';
}

export function adminUsersIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/users', params);
}

export function adminUserShowPath(userId: number | string): string {
    return `/admin/users/${userId}`;
}

export function adminUserStatusPath(userId: number | string): string {
    return `/admin/users/${userId}/status`;
}

export function adminUserDestroyPath(userId: number | string): string {
    return `/admin/users/${userId}`;
}

export function adminEmployerVerificationsIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/employer-verifications', params);
}

export function adminEmployerVerificationShowPath(
    userId: number | string,
): string {
    return `/admin/employer-verifications/${userId}`;
}

export function adminEmployerVerificationUpdatePath(
    userId: number | string,
): string {
    return `/admin/employer-verifications/${userId}`;
}

export function adminCompanyVerificationsIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/company-verifications', params);
}

export function adminCompanyVerificationShowPath(
    userId: number | string,
): string {
    return `/admin/company-verifications/${userId}`;
}

export function adminCompanyVerificationUpdatePath(
    userId: number | string,
): string {
    return `/admin/company-verifications/${userId}`;
}

export function adminJobModerationIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/job-moderation', params);
}

export function adminJobModerationShowPath(vacancyId: number | string): string {
    return `/admin/job-moderation/${vacancyId}`;
}

export function adminJobModerationUpdatePath(
    vacancyId: number | string,
): string {
    return `/admin/job-moderation/${vacancyId}`;
}

export function adminSuspiciousUsersIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/suspicious-users', params);
}

export function adminSuspiciousUserShowPath(userId: number | string): string {
    return `/admin/suspicious-users/${userId}`;
}

export function adminSuspiciousUserUpdatePath(userId: number | string): string {
    return `/admin/suspicious-users/${userId}`;
}

export function adminContentApprovalIndexPath(
    type?: string,
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/content-approval', {
        ...params,
        ...(type ? { type } : {}),
    });
}

export function adminContentApprovalQuizShowPath(
    assessmentId: number | string,
): string {
    return `/admin/content-approval/quizzes/${assessmentId}`;
}

export function adminContentApprovalQuizUpdatePath(
    assessmentId: number | string,
): string {
    return `/admin/content-approval/quizzes/${assessmentId}`;
}

export function adminContentApprovalSummaryShowPath(cvId: number | string): string {
    return `/admin/content-approval/summaries/${cvId}`;
}

export function adminContentApprovalSummaryUpdatePath(
    cvId: number | string,
): string {
    return `/admin/content-approval/summaries/${cvId}`;
}

export function adminAnnouncementsIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/announcements', params);
}

export function adminAnnouncementsStorePath(): string {
    return '/admin/announcements';
}

export function adminAnnouncementVisibilityPath(
    announcementId: number | string,
): string {
    return `/admin/announcements/${announcementId}/visibility`;
}

export function adminReportsIndexPath(): string {
    return '/admin/reports';
}

export function adminChatReportsIndexPath(
    params?: Record<string, string | number | undefined>,
): string {
    return withQuery('/admin/chat-reports', params);
}

export function adminChatReportShowPath(reportId: number | string): string {
    return `/admin/chat-reports/${reportId}`;
}

export function adminChatReportUpdatePath(reportId: number | string): string {
    return `/admin/chat-reports/${reportId}`;
}
