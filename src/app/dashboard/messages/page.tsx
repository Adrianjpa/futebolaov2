"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { MessageStatus } from "@/components/chat/MessageStatus";

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    created_at: string;
    read: boolean;
    delivered?: boolean;
}

export default function MessagesPage() {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const fetchMessages = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order("created_at", { ascending: true });

            if (error) throw error;

            const msgs = data as Message[];
            setMessages(msgs || []);
            setLoading(false);
            scrollToBottom();

            // Mark UNREAD messages from Admin as READ (since user is opening the page)
            const unreadIds = msgs
                .filter(m => m.receiver_id === user.id && !m.read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                await (supabase.from("messages") as any)
                    .update({ read: true, delivered: true })
                    .in("id", unreadIds);

                // Local update?
                setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true, delivered: true } : m));
            }

        } catch (error) {
            console.error("Error fetching messages:", error);
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
        fetchMessages();

        const channel = supabase
            .channel('messages-user')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user?.id}` // Listen for incoming
            }, async (payload) => {
                const newMsg = payload.new as Message;
                setMessages(prev => [...prev, newMsg]);
                scrollToBottom();

                // If user is on this page, mark as Read immediately
                await (supabase.from("messages") as any)
                    .update({ read: true, delivered: true })
                    .eq("id", newMsg.id);
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${user?.id}` // Listen for my own messages (if sent from another device)
            }, (payload) => {
                const newMsg = payload.new as Message;
                // Avoid Duplicate if we optimistic added it? No optimistic here yet.
                // But since we add it manually on send, let's check ID.
                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                scrollToBottom();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return;

        const msgContent = newMessage.trim();
        setNewMessage(""); // Optimistic clear
        setSending(true);

        try {
            const { data, error } = await supabase
                .from("messages")
                .insert({
                    sender_id: user.id,
                    receiver_id: null, // To Admin/System
                    content: msgContent
                } as any)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setMessages(prev => [...prev, data]);
                scrollToBottom();
            }
        } catch (error) {
            console.error("Error sending message:", error);
            // Optionally restore message input
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
                <h1 className="text-3xl font-bold tracking-tight">Mensagens</h1>
                <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Comunicação direta com a administração.</p>
                    {profile?.funcao === 'admin' && (
                        <Button variant="outline" asChild>
                            <Link href="/admin/messaging">
                                Ir para Painel Admin
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-2 shadow-sm">
                <CardHeader className="border-b bg-muted/20 py-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Suporte / Admin
                    </CardTitle>
                    <CardDescription>
                        Fale conosco diretamente por aqui.
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 relative bg-slate-50 dark:bg-slate-900/50">
                    <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2">
                                <MessageSquare className="h-12 w-12" />
                                <p>Nenhuma mensagem ainda.</p>
                                <p className="text-sm">Envie um "Olá" para começar!</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === user?.id;
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`
                                                max-w-[80%] rounded-2xl px-4 py-3 shadow-sm
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
                                                    <MessageStatus isRead={msg.read} isDelivered={msg.delivered || false} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>

                <div className="p-4 bg-background border-t">
                    <div className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua mensagem..."
                            className="flex-1"
                            disabled={sending}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={sending || !newMessage.trim()}
                            size="icon"
                            className={sending ? 'opacity-70' : ''}
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
