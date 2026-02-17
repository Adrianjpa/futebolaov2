"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, Users, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageStatus } from "@/components/chat/MessageStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUnreadMessages } from "@/contexts/UnreadMessagesContext";

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    created_at: string;
    read: boolean;
}

interface Profile {
    id: string;
    nickname: string | null;
    nome: string;
    foto_perfil: string | null;
}

import { useSearchParams } from "next/navigation";

export default function AdminMessagingPage() {
    const { user: currentUser } = useAuth();
    const searchParams = useSearchParams();
    const initialChatId = searchParams.get("chat");

    const [messages, setMessages] = useState<Message[]>([]);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [conversations, setConversations] = useState<string[]>([]); // User IDs
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // 1. Fetch All Messages & Group
    const fetchData = async () => {
        try {
            // Fetch messages (admin sees all due to RLS)
            const { data: msgsData, error: msgsError } = await supabase
                .from("messages")
                .select("*")
                .order("created_at", { ascending: true });

            if (msgsError) throw msgsError;

            // Fetch profiles involved
            const { data: profilesData, error: profilesError } = await (supabase
                .from("profiles") as any) // Type assertion might be needed if types aren't fully updated in cache
                .select("id, nickname, nome, foto_perfil");

            if (profilesError) throw profilesError;

            const profilesMap: Record<string, Profile> = {};
            profilesData?.forEach((p: Profile) => {
                profilesMap[p.id] = p;
            });
            setProfiles(profilesMap);

            // Group conversations
            const userIds = new Set<string>();
            msgsData?.forEach(m => {
                // If I am admin (sender) -> receiver is the partner
                // If I am admin (receiver/null) -> sender is the partner
                if (m.sender_id === currentUser?.id) {
                    if (m.receiver_id) userIds.add(m.receiver_id);
                } else {
                    userIds.add(m.sender_id);
                }
            });

            // Convert set to array and sort by latest message? 
            // For now just array
            setConversations(Array.from(userIds));
            setConversations(Array.from(userIds));
            setMessages((msgsData as unknown as Message[]) || []);
            setLoading(false);

        } catch (error) {
            console.error("Error fetching admin messages:", error);
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        if (currentUser) fetchData();

        // Realtime Subscription (Admin Global Listen)
        const channel = supabase
            .channel('messages-admin')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                // Re-fetch easiest way to get consistent state and new profiles if needed
                // But optimization: just push message and if new user, fetch profile?
                // Let's just re-fetch for MVP robustness
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    // Handle initial chat param (auto-open)
    useEffect(() => {
        if (initialChatId && conversations.includes(initialChatId) && !selectedUserId) {
            handleSelectUser(initialChatId);
            // Clear param after selection to avoid sticky state? 
            // Ideally we just select.
        } else if (initialChatId && !conversations.includes(initialChatId) && !loading) {
            // Case where user is not in list yet (should not happen if they sent message) or list not loaded
            // But if they just sent a message, they should be in the list after fetchData
            if (initialChatId) {
                // Force fetch profile for this ID if missing? 
                // For now, retry or wait.
                // Actually, fetchData sets conversations. So we wait for loading to be false.
            }
        }
    }, [initialChatId, conversations, loading]);

    // Scroll when selecting user
    useEffect(() => {
        scrollToBottom();
    }, [selectedUserId, messages]);

    const { markAsRead } = useUnreadMessages();

    const handleSelectUser = async (userId: string) => {
        setSelectedUserId(userId);
        await markAsRead(userId);

        // Optimistic update for local view
        setMessages(prev => prev.map(m =>
            (m.sender_id === userId && m.receiver_id === null)
                ? { ...m, read: true }
                : m
        ));
    };


    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser || !selectedUserId) return;

        const msgContent = newMessage.trim();
        setNewMessage("");
        setSending(true);

        try {
            const { data, error } = await supabase
                .from("messages")
                .insert({
                    sender_id: currentUser.id,
                    receiver_id: selectedUserId, // Explicitly to the user
                    content: msgContent
                })
                .select()
                .single();

            if (error) throw error;

            // Realtime will catch it, but optimistic update
            if (data) {
                setMessages(prev => [...prev, data]);
                scrollToBottom();
            }

        } catch (error) {
            console.error("Error sending reply:", error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Filter messages for current view
    const currentMessages = messages.filter(m =>
        (m.sender_id === selectedUserId && !m.receiver_id) || // User sent to System
        (m.sender_id === selectedUserId && m.receiver_id === currentUser?.id) || // User sent to ME (future support)
        (m.sender_id === currentUser?.id && m.receiver_id === selectedUserId) // I sent to User
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mensagens (Admin)</h1>
                <p className="text-muted-foreground">Gerencie o suporte e a comunicação.</p>
            </div>

            <div className="flex h-full border rounded-xl overflow-hidden shadow-sm bg-card">
                {/* Conversation List */}
                <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar usuário..." className="pl-8" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground p-4">Nenhuma conversa.</p>
                        ) : (
                            conversations.map(userId => {
                                const profile = profiles[userId];
                                const isSelected = selectedUserId === userId;
                                return (
                                    <div
                                        key={userId}
                                        onClick={() => handleSelectUser(userId)}
                                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors ${isSelected ? 'bg-muted/30 border-l-4 border-primary' : ''}`}
                                    >
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={profile?.foto_perfil || undefined} />
                                            <AvatarFallback>{(profile?.nickname || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate">{profile?.nickname || profile?.nome || "Usuário"}</p>
                                            <p className="text-xs text-muted-foreground truncate">Clique para visualizar</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-background">
                    {selectedUserId ? (
                        <>
                            <div className="p-4 border-b flex items-center gap-3 shadow-sm z-10">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={profiles[selectedUserId]?.foto_perfil || undefined} />
                                    <AvatarFallback>{(profiles[selectedUserId]?.nickname || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-sm">{profiles[selectedUserId]?.nickname || profiles[selectedUserId]?.nome}</p>
                                    <p className="text-xs text-muted-foreground">Conversa Direta</p>
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                                {currentMessages.map(msg => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`
                                                    max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
                                                    ${isMe
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                                                    }
                                                `}
                                            >
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                                <div className={`text-[10px] mt-1 opacity-70 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {format(new Date(msg.created_at), "dd MMM HH:mm", { locale: ptBR })}
                                                    {isMe && (
                                                        <MessageStatus isRead={msg.read} isDelivered={msg.delivered} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 border-t bg-background">
                                <div className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Digite uma resposta..."
                                        className="flex-1"
                                        disabled={sending}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={sending || !newMessage.trim()}
                                        size="icon"
                                    >
                                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Users className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Selecione uma conversa</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
