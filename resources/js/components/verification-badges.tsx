interface EmployerVerificationInfo {
    employer_type?: 'basic' | 'company' | string | null;
    employer_verification_status?: string | null;
    company_verification_status?: string | null;
}

const verifiedEmployerClass =
    'inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700';
const verifiedCompanyClass =
    'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700';

export function VerificationBadges({
    employer,
}: {
    employer?: EmployerVerificationInfo | null;
}) {
    if (!employer) {
        return null;
    }

    const isCompany = employer.employer_type === 'company';
    const employerVerified = employer.employer_verification_status === 'approved';
    const companyVerified = employer.company_verification_status === 'approved';

    if (isCompany) {
        if (!companyVerified) {
            return null;
        }

        return (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={verifiedCompanyClass}>
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" d="M2 6l3 3 5-5" />
                    </svg>
                    Company Verified
                </span>
            </div>
        );
    }

    if (!employerVerified) {
        return null;
    }

    return (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={verifiedEmployerClass}>
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M5.5 1.5L4.5 2.5 2 3l1.5 2.5L3 8l2.5-1 2.5 1-.5-2.5L8 3 5.5 2.5 5.5 1.5z" />
                </svg>
                Employer Verified
            </span>
        </div>
    );
}

export function isEmployerVerified(employer?: EmployerVerificationInfo | null): boolean {
    if (!employer) {
        return false;
    }

    if (employer.employer_type === 'company') {
        return employer.company_verification_status === 'approved';
    }

    return employer.employer_verification_status === 'approved';
}
