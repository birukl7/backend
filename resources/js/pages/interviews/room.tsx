import { Head } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

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
    candidate_name: string | null;
}

interface Props {
    interview: InterviewData;
    display_name: string;
    room_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFull(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        year: "numeric", hour: "numeric", minute: "2-digit",
    });
}

// ─── Jitsi API Declaration ────────────────────────────────────────────────────

declare global {
    interface Window {
        JitsiMeetExternalAPI: new (domain: string, options: Record<string, unknown>) => {
            addEventListener: (event: string, handler: () => void) => void;
            dispose: () => void;
        };
    }
}

// ─── Room Page ────────────────────────────────────────────────────────────────

export default function InterviewRoom({ interview, display_name, room_id }: Props) {
    // containerRef is ALWAYS rendered (just hidden until joined).
    // This means it's attached before startCall() runs — no timing race.
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<ReturnType<typeof window.JitsiMeetExternalAPI> | null>(null);
    const [jitsiReady, setJitsiReady] = useState(false);
    const [joined, setJoined] = useState(false);
    const [ended, setEnded] = useState(false);
    const [scriptError, setScriptError] = useState(false);

    // Load Jitsi Meet External API script once on mount
    useEffect(() => {
        if (document.getElementById("jitsi-script")) {
            // Script tag exists; check if the API is already available (e.g. hot-reload)
            if (window.JitsiMeetExternalAPI) setJitsiReady(true);
            return;
        }
        const script = document.createElement("script");
        script.id = "jitsi-script";
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => setJitsiReady(true);
        script.onerror = () => setScriptError(true);
        document.head.appendChild(script);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => { apiRef.current?.dispose(); };
    }, []);

    // Called when user clicks "Join Interview Room".
    // containerRef.current is guaranteed non-null because the div is always rendered.
    function startCall() {
        if (!jitsiReady || !containerRef.current) return;

        // Initialize Jitsi FIRST (ref already attached), then flip joined state.
        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
            roomName: room_id,
            width: "100%",
            height: "100%",
            parentNode: containerRef.current,
            userInfo: { displayName: display_name },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: true,
                disableDeepLinking: true,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    "microphone", "camera", "closedcaptions", "desktop",
                    "fullscreen", "fodeviceselection", "hangup", "chat",
                    "raisehand", "videoquality", "tileview", "shortcuts",
                    "mute-everyone", "security",
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
            },
        });

        api.addEventListener("videoConferenceLeft", () => setEnded(true));
        apiRef.current = api;
        setJoined(true); // show container, hide lobby — AFTER api is initialised
    }

    const isCancelled = interview.status === "cancelled";
    const isCompleted = interview.status === "completed";

    // ── Ended screen ──────────────────────────────────────────────────────────
    if (ended) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <Head title="Interview Ended" />
                <div className="bg-slate-900 border border-slate-700 rounded-3xl p-10 max-w-md w-full text-center">
                    <div className="w-16 h-16 mx-auto mb-5 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Interview Ended</h1>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        You've left the interview room for <strong className="text-slate-200">{interview.vacancy_title}</strong>.
                    </p>
                    <div className="flex gap-3">
                        <a href="/my-interviews" className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors text-center">
                            My Interviews
                        </a>
                        <button
                            onClick={() => {
                                apiRef.current?.dispose();
                                apiRef.current = null;
                                setEnded(false);
                                setJoined(false);
                            }}
                            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
                        >
                            Rejoin Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <Head title={`Interview — ${interview.vacancy_title}`} />

            {/* Top bar */}
            <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <a href="/" className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M9.78 3.22a.75.75 0 010 1.06L6.56 7.5l3.22 3.22a.75.75 0 11-1.06 1.06L4.97 8.03a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd"/>
                        </svg>
                    </a>
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{interview.vacancy_title}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                            {interview.employer_name ?? interview.candidate_name ?? "Interview"} ·{" "}
                            {fmtFull(interview.scheduled_at)}
                            {interview.timezone ? ` (${interview.timezone})` : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {interview.status === "scheduled" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-violet-900/60 text-violet-300 border border-violet-700 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                            Live
                        </span>
                    )}
                    <button
                        onClick={() => navigator.clipboard.writeText(interview.meeting_link)}
                        className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                            <path d="M3 11V3a2 2 0 012-2h8" strokeLinecap="round"/>
                        </svg>
                        Copy Link
                    </button>
                </div>
            </div>

            {/* Main area */}
            <div className="flex-1 relative">

                {/* Jitsi container — ALWAYS in the DOM, shown/hidden via display */}
                <div
                    ref={containerRef}
                    className="absolute inset-0"
                    style={{ display: joined ? "block" : "none" }}
                />

                {/* Pre-join lobby — conditionally rendered on top */}
                {!joined && (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-10 max-w-lg w-full text-center">

                            {isCancelled && (
                                <div className="mb-6 bg-red-900/30 border border-red-700 rounded-2xl px-5 py-4">
                                    <p className="text-red-400 font-semibold text-sm">This interview has been cancelled</p>
                                    <p className="text-red-500/70 text-[12px] mt-1">You can still join the room if needed.</p>
                                </div>
                            )}
                            {isCompleted && (
                                <div className="mb-6 bg-emerald-900/30 border border-emerald-700 rounded-2xl px-5 py-4">
                                    <p className="text-emerald-400 font-semibold text-sm">This interview has been marked complete</p>
                                    <p className="text-emerald-500/70 text-[12px] mt-1">You can still access the room.</p>
                                </div>
                            )}

                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-violet-900/40">
                                {display_name.slice(0, 2).toUpperCase()}
                            </div>

                            <h1 className="text-xl font-bold text-white mb-1">{interview.vacancy_title}</h1>
                            <p className="text-slate-400 text-sm mb-6">
                                {interview.employer_name ?? interview.candidate_name}
                                {interview.vacancy_location ? ` · ${interview.vacancy_location}` : ""}
                            </p>

                            <div className="bg-slate-800/60 rounded-2xl px-5 py-4 mb-6 text-left space-y-2.5">
                                <div className="flex items-center gap-3 text-sm">
                                    <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                                        <path strokeLinecap="round" d="M5 1.5v3M11 1.5v3M2 7h12"/>
                                    </svg>
                                    <span className="text-slate-300">{fmtFull(interview.scheduled_at)}</span>
                                </div>
                                {interview.timezone && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <circle cx="8" cy="8" r="6.5"/><path strokeLinecap="round" d="M8 5v3.5l2 1.5"/>
                                        </svg>
                                        <span className="text-slate-300">{interview.timezone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-sm">
                                    <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9.5l-3 2.5V12H3.5A1.5 1.5 0 012 10.5v-7z"/>
                                    </svg>
                                    <span className="text-slate-300 break-all text-[12px]">{interview.meeting_link}</span>
                                </div>
                            </div>

                            {interview.notes && (
                                <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl px-4 py-3 mb-6 text-left">
                                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Notes</p>
                                    <p className="text-[13px] text-amber-300/80 leading-relaxed">{interview.notes}</p>
                                </div>
                            )}

                            {scriptError ? (
                                <div className="bg-red-900/30 border border-red-700 rounded-2xl px-5 py-4 mb-4">
                                    <p className="text-red-400 text-sm">Could not load Jitsi Meet. Please check your connection.</p>
                                    <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer"
                                        className="mt-2 inline-block text-[12px] text-red-300 hover:underline">
                                        Open meeting link directly →
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={startCall}
                                    disabled={!jitsiReady}
                                    className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {!jitsiReady ? (
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
                                                <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9.5l-3 2.5V12H3.5A1.5 1.5 0 012 10.5v-7z"/>
                                            </svg>
                                            Join Interview Room
                                        </>
                                    )}
                                </button>
                            )}

                            <p className="text-[11px] text-slate-600 mt-4">
                                Powered by{" "}
                                <a href="https://jitsi.org" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition-colors">
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