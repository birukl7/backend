import { resolveAppRole } from "@/config/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInitials } from "@/hooks/use-initials";
import { cn } from "@/lib/utils";
import type { Auth } from "@/types";
import { Head, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InterviewData {
    id: number;
    scheduled_at: string;
    status: string;
    notes: string | null;
    timezone: string | null;
    room_id: string;
    meeting_link: string;
    vacancy_title: string;
    vacancy_location: string | null;
    application_id: number;
    employer_name: string | null;
    employer_avatar: string | null;
    candidate_name: string | null;
    candidate_avatar: string | null;
}

interface Props {
    interview: InterviewData;
    display_name: string;
    room_id: string;
}

interface JitsiAPI {
    addEventListener: (event: string, handler: (data?: unknown) => void) => void;
    executeCommand: (command: string, ...args: unknown[]) => void;
    getNumberOfParticipants: () => number;
    dispose: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: new (domain: string, options: Record<string, unknown>) => JitsiAPI;
    }
}

type ScriptStatus = "idle" | "loading" | "ready" | "error";
type PermissionStatus = "unknown" | "checking" | "granted" | "denied" | "unavailable";
type CallStatus = "lobby" | "joining" | "active" | "ended" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFull(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        year: "numeric", hour: "numeric", minute: "2-digit",
    });
}

async function probePermissions(): Promise<PermissionStatus> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(t => t.stop());
        return "granted";
    } catch (err) {
        if (err instanceof DOMException) {
            return err.name === "NotAllowedError" ? "denied" : "unavailable";
        }
        return "unavailable";
    }
}

function UserAvatar({
    name,
    src,
    size = "lg",
    className,
}: {
    name: string;
    src?: string | null;
    size?: "lg" | "sm";
    className?: string;
}) {
    const getInitials = useInitials();
    const isLarge = size === "lg";

    return (
        <Avatar
            className={cn(
                "shrink-0 overflow-hidden rounded-full",
                isLarge ? "size-20 shadow-md shadow-blue-100" : "size-9 border border-slate-200",
                className,
            )}
        >
            <AvatarImage src={src ?? undefined} alt={name} className="size-full object-cover object-center" />
            <AvatarFallback
                className={cn(
                    "rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold",
                    isLarge ? "text-2xl" : "text-xs",
                )}
            >
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

// ─── Room Page ────────────────────────────────────────────────────────────────

export default function InterviewRoom({ interview, display_name, room_id }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isEmployer = resolveAppRole(auth.roles) === "employer";
    const interviewsListUrl = isEmployer ? "/employer/interviews" : "/my-interviews";
    const userAvatar = auth.user?.avatar ?? null;
    const otherPartyName = interview.employer_name ?? interview.candidate_name ?? "Participant";
    const otherPartyAvatar = interview.employer_name
        ? interview.employer_avatar
        : interview.candidate_avatar;

    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<JitsiAPI | null>(null);
    const joinSessionRef = useRef(0);

    const [scriptStatus, setScriptStatus] = useState<ScriptStatus>("idle");
    const [permStatus, setPermStatus] = useState<PermissionStatus>("unknown");
    const [callStatus, setCallStatus] = useState<CallStatus>("lobby");
    const [joinSession, setJoinSession] = useState(0);
    const [participantCount, setParticipantCount] = useState(1);
    const [linkCopied, setLinkCopied] = useState(false);
    const [callError, setCallError] = useState<string | null>(null);
    const [scriptRetries, setScriptRetries] = useState(0);

    // ── Script loading ────────────────────────────────────────────────────────

    const loadScript = useCallback(() => {
        const existing = document.getElementById("jitsi-script");
        if (existing) existing.remove();

        setScriptStatus("loading");
        const script = document.createElement("script");
        script.id = "jitsi-script";
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => setScriptStatus(window.JitsiMeetExternalAPI ? "ready" : "error");
        script.onerror = () => setScriptStatus("error");
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (window.JitsiMeetExternalAPI) { setScriptStatus("ready"); return; }
        loadScript();
    }, [loadScript]);

    useEffect(() => {
        return () => {
            apiRef.current?.dispose();
            apiRef.current = null;
        };
    }, []);

    const retryScript = () => {
        if (scriptRetries >= 3) return;
        setScriptRetries(r => r + 1);
        loadScript();
    };

    const startJoin = () => {
        joinSessionRef.current += 1;
        setJoinSession(joinSessionRef.current);
        setCallStatus("joining");
        setCallError(null);
    };

    // ── Jitsi initialisation ─────────────────────────────────────────────────
    // Triggered by joinSession (not callStatus) so moving joining → active does
    // not dispose the iframe. Container stays mounted so the ref is always ready.

    useLayoutEffect(() => {
        if (joinSession === 0 || scriptStatus !== "ready") return;

        const container = containerRef.current;
        if (!container) return;

        let active = true;
        const session = joinSession;

        apiRef.current?.dispose();
        apiRef.current = null;
        container.replaceChildren();

        const height = container.clientHeight || Math.max(window.innerHeight - 64, 480);
        const width = container.clientWidth || window.innerWidth;

        try {
            const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
                roomName: room_id,
                width,
                height,
                parentNode: container,
                userInfo: {
                    displayName: display_name,
                    ...(userAvatar ? { avatarURL: userAvatar } : {}),
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    enableNoisyMicDetection: true,
                    enableNoAudioDetection: true,
                    p2p: { enabled: true },
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        "microphone", "camera", "desktop", "fullscreen",
                        "fodeviceselection", "hangup", "chat", "raisehand",
                        "videoquality", "tileview", "security",
                    ],
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    SHOW_BRAND_WATERMARK: false,
                    SHOW_POWERED_BY: false,
                    DISPLAY_WELCOME_FOOTER: false,
                    HIDE_INVITE_MORE_HEADER: true,
                    MOBILE_APP_PROMO: false,
                    DEFAULT_BACKGROUND: "#f8fafc",
                },
            });

            apiRef.current = api;

            // Show the meeting UI as soon as the embed mounts; don't wait forever
            // for videoConferenceJoined (it may not fire in some browser setups).
            const revealMeeting = () => {
                if (active && session === joinSessionRef.current) {
                    setCallStatus("active");
                }
            };

            requestAnimationFrame(revealMeeting);

            api.addEventListener("videoConferenceJoined", () => {
                if (active && session === joinSessionRef.current) {
                    revealMeeting();
                    setParticipantCount(api.getNumberOfParticipants());
                }
            });
            api.addEventListener("participantJoined", () => {
                if (active) setParticipantCount(api.getNumberOfParticipants());
            });
            api.addEventListener("participantLeft", () => {
                if (active) setParticipantCount(api.getNumberOfParticipants());
            });
            api.addEventListener("videoConferenceLeft", () => {
                if (active && session === joinSessionRef.current) {
                    setCallStatus("ended");
                }
            });
            api.addEventListener("connectionFailed", () => {
                if (active && session === joinSessionRef.current) {
                    setCallError("Connection to the meeting server failed. Check your network and try again.");
                    setCallStatus("error");
                }
            });
        } catch {
            if (active && session === joinSessionRef.current) {
                setCallError("Failed to start the meeting room. Please try again.");
                setCallStatus("error");
            }
        }

        return () => {
            active = false;
            apiRef.current?.dispose();
            apiRef.current = null;
        };
    }, [joinSession, scriptStatus, room_id, display_name, userAvatar]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const checkPermissions = async () => {
        setPermStatus("checking");
        setPermStatus(await probePermissions());
    };

    const copyLink = async () => {
        await navigator.clipboard.writeText(interview.meeting_link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const rejoin = () => {
        apiRef.current?.dispose();
        apiRef.current = null;
        containerRef.current?.replaceChildren();
        setCallStatus("lobby");
        setCallError(null);
        setParticipantCount(1);
    };

    // ── Ended screen ──────────────────────────────────────────────────────────

    if (callStatus === "ended") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Head title="Interview Ended" />
                <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Interview Ended</h1>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8">
                        You left the room for <strong className="text-slate-800">{interview.vacancy_title}</strong>.
                    </p>
                    <div className="flex gap-3">
                        <a href={interviewsListUrl}
                            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors text-center">
                            {isEmployer ? "My Interviews" : "Back to Interviews"}
                        </a>
                        <button onClick={rejoin}
                            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                            Rejoin
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isCancelled = interview.status === "cancelled";
    const isCompleted = interview.status === "completed";
    const isActive    = callStatus === "active" || callStatus === "joining";

    return (
        <div className="h-dvh min-h-screen bg-slate-50 flex flex-col overflow-hidden">
            <Head title={`Interview — ${interview.vacancy_title}`} />

            {/* ── Top bar ── */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <a href={interviewsListUrl} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06L4.97 8.03a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd"/>
                        </svg>
                    </a>
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">{interview.vacancy_title}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                            {interview.employer_name ?? interview.candidate_name ?? "Interview"} ·{" "}
                            {fmtFull(interview.scheduled_at)}
                            {interview.timezone ? ` (${interview.timezone})` : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                            Live · {participantCount} participant{participantCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M6 2H2.5A1.5 1.5 0 001 3.5v10A1.5 1.5 0 002.5 15h10A1.5 1.5 0 0014 13.5V10M10 1h5m0 0v5m0-5L6.5 9.5"/>
                        </svg>
                        Open externally
                    </a>
                    <button onClick={copyLink}
                        className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
                        {linkCopied ? (
                            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M2 8l4 4 8-8"/>
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                                <path d="M3 11V3a2 2 0 012-2h8" strokeLinecap="round"/>
                            </svg>
                        )}
                        {linkCopied ? "Copied!" : "Copy link"}
                    </button>
                </div>
            </div>

            {/* ── Main area ── */}
            <div className="flex-1 min-h-0 relative">

                {/* Jitsi mount point — always in the DOM so the ref exists before init runs */}
                <div
                    ref={containerRef}
                    className={cn(
                        "absolute inset-0 size-full bg-slate-900",
                        "[&_iframe]:size-full [&_iframe]:min-h-full [&>div]:size-full",
                        (callStatus === "lobby") && "invisible pointer-events-none",
                    )}
                />

                {/* Loading overlay while Jitsi connects */}
                {callStatus === "joining" && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3 text-slate-600">
                            <svg className="w-8 h-8 animate-spin text-violet-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                            <p className="text-sm font-medium">Connecting to interview room…</p>
                        </div>
                    </div>
                )}

                {/* Connection error */}
                {callStatus === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="bg-white border border-red-200 rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
                            <div className="w-14 h-14 mx-auto mb-5 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h2>
                            <p className="text-slate-500 text-sm mb-6">{callError}</p>
                            <div className="flex gap-3">
                                <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors text-center">
                                    Open in browser
                                </a>
                                <button onClick={rejoin}
                                    className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pre-join lobby */}
                {callStatus === "lobby" && (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-10 max-w-lg w-full text-center">

                            {isCancelled && (
                                <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                                    <p className="text-red-700 font-semibold text-sm">This interview has been cancelled</p>
                                    <p className="text-red-500 text-[12px] mt-1">You can still join the room if needed.</p>
                                </div>
                            )}
                            {isCompleted && (
                                <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                                    <p className="text-emerald-700 font-semibold text-sm">This interview has been marked complete</p>
                                    <p className="text-emerald-600 text-[12px] mt-1">You can still access the room.</p>
                                </div>
                            )}

                            {/* Avatar */}
                            <UserAvatar
                                name={display_name}
                                src={userAvatar}
                                size="lg"
                                className="mx-auto mb-6"
                            />

                            <h1 className="text-xl font-bold text-slate-900 mb-1">{interview.vacancy_title}</h1>
                            <div className="flex items-center justify-center gap-2.5 mb-6">
                                <UserAvatar name={otherPartyName} src={otherPartyAvatar} size="sm" />
                                <p className="text-slate-500 text-sm text-left">
                                    with {otherPartyName}
                                    {interview.vacancy_location ? (
                                        <span className="block text-slate-400 text-[12px] mt-0.5">{interview.vacancy_location}</span>
                                    ) : null}
                                </p>
                            </div>

                            {/* Meeting details */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mb-6 text-left space-y-2.5">
                                <div className="flex items-center gap-3 text-sm">
                                    <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                                        <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                                    </svg>
                                    <span className="text-slate-700">{fmtFull(interview.scheduled_at)}</span>
                                </div>
                                {interview.timezone && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <circle cx="8" cy="8" r="6.5"/>
                                            <path strokeLinecap="round" d="M8 5v3.5l2 1.5"/>
                                        </svg>
                                        <span className="text-slate-700">{interview.timezone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {interview.notes && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-6 text-left">
                                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">Notes</p>
                                    <p className="text-[13px] text-amber-700 leading-relaxed">{interview.notes}</p>
                                </div>
                            )}

                            {/* Permission pre-flight */}
                            {permStatus === "unknown" && (
                                <button onClick={checkPermissions}
                                    className="w-full py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-sm transition-colors mb-3 flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" d="M8 2a3 3 0 013 3v3a3 3 0 01-6 0V5a3 3 0 013-3zM5 8a3 3 0 006 0M8 11v3M6 14h4"/>
                                    </svg>
                                    Test camera &amp; microphone
                                </button>
                            )}
                            {permStatus === "checking" && (
                                <div className="flex items-center justify-center gap-2 text-[13px] text-slate-500 mb-3">
                                    <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                    </svg>
                                    Checking permissions…
                                </div>
                            )}
                            {permStatus === "granted" && (
                                <div className="flex items-center justify-center gap-1.5 text-[12px] text-emerald-600 mb-3">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" d="M2 8l4 4 8-8"/>
                                    </svg>
                                    Camera and microphone ready
                                </div>
                            )}
                            {(permStatus === "denied" || permStatus === "unavailable") && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-3 text-left">
                                    <p className="text-yellow-800 text-[12px] font-semibold">
                                        {permStatus === "denied" ? "Camera / microphone access denied" : "Camera or microphone not found"}
                                    </p>
                                    <p className="text-yellow-700 text-[11px] mt-0.5">
                                        You can still join, but others may not see or hear you. Allow access in your browser settings.
                                    </p>
                                </div>
                            )}

                            {/* Join / retry */}
                            {scriptStatus === "error" ? (
                                <div className="space-y-3">
                                    <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
                                        <p className="text-red-700 text-sm font-semibold">Could not load Jitsi Meet</p>
                                        <p className="text-red-500 text-[12px] mt-1">Check your connection and try again, or open the meeting directly.</p>
                                    </div>
                                    {scriptRetries < 3 && (
                                        <button onClick={retryScript}
                                            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors">
                                            Retry ({3 - scriptRetries} attempt{3 - scriptRetries !== 1 ? "s" : ""} left)
                                        </button>
                                    )}
                                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                                        className="block w-full py-3 rounded-2xl border border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold text-sm transition-colors text-center">
                                        Open in Jitsi Meet app →
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={startJoin}
                                    disabled={scriptStatus !== "ready"}
                                    className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200"
                                >
                                    {scriptStatus !== "ready" ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                            </svg>
                                            Loading room…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M11 2a1 1 0 011 1v2.5l2-1.5V12l-2-1.5V13a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1h9z"/>
                                            </svg>
                                            Join Interview Room
                                        </>
                                    )}
                                </button>
                            )}

                            <p className="text-[11px] text-slate-400 mt-4">
                                Powered by{" "}
                                <a href="https://jitsi.org" target="_blank" rel="noopener noreferrer"
                                    className="text-slate-500 hover:text-slate-700 transition-colors">
                                    Jitsi Meet
                                </a>
                                {" "}· End-to-end encrypted
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
