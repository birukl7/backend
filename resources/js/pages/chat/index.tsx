import AppLayout from '@/layouts/app-layout';
import { type ChatMessage, ChatWindow, type Conversation } from '@/components/chat-window';
import { Head, usePage } from '@inertiajs/react';

interface Props {
    conversations: Conversation[];
    active_conversation: Conversation | null;
    active_messages: ChatMessage[];
}

export default function JobSeekerChat() {
    const { conversations, active_conversation, active_messages, auth } =
        usePage().props as unknown as Props & { auth: { user: { id: number } } };

    return (
        <AppLayout>
            <Head title="Messages" />

            <div className="flex h-[calc(100vh-4rem)] flex-col px-4 py-4 md:px-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            Messages
                        </h1>
                        <p className="text-sm text-slate-500">
                            Chat with employers about opportunities
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ChatWindow
                        conversations={conversations}
                        activeConversation={active_conversation}
                        initialMessages={active_messages}
                        currentUserId={auth.user.id}
                        emptyState={
                            <div className="flex flex-col items-center gap-3 px-8 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                                    <span className="text-3xl">💬</span>
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                                        No messages yet
                                    </p>
                                    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                                        When an employer reaches out to you, their message will appear here.
                                    </p>
                                </div>
                            </div>
                        }
                    />
                </div>
            </div>
        </AppLayout>
    );
}
