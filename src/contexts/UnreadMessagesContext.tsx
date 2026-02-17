"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { toast } from "sonner"; // Assuming sonner is used, or use another toast lib
import { MessageSquare } from "lucide-react";

interface Profile {
    id: string;
    nickname: string | null;
    nome: string;
    foto_perfil: string | null;
}

interface UnreadMessagesContextType {
    unreadCount: number;
    latestSender: Profile | null;
    refreshUnreadCount: () => Promise<void>;
    markAsRead: (senderId: string) => Promise<void>;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
    const { profile, user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [latestSender, setLatestSender] = useState<Profile | null>(null);
    const supabase = createClient();

    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    const refreshUnreadCount = async () => {
        if (!isAdmin) return;

        // 1. Get Count
        const { count, error } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .is("receiver_id", null) // Messages to admin
            .eq("read", false);

        if (!error && count !== null) {
            setUnreadCount(count);

            // 2. Get Latest Message Sender if count > 0
            if (count > 0) {
                const { data: latestMsg } = await (supabase
                    .from("messages") as any)
                    .select("sender_id")
                    .is("receiver_id", null)
                    .eq("read", false)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (latestMsg) {
                    const { data: senderArgs } = await (supabase
                        .from("profiles") as any)
                        .select("id, nickname, nome, foto_perfil")
                        .eq("id", latestMsg.sender_id)
                        .single();

                    if (senderArgs) {
                        setLatestSender(senderArgs as Profile);
                    }
                }
            } else {
                setLatestSender(null);
            }
        } else {
            setLatestSender(null);
        }
    };

    const markAsRead = async (senderId: string) => {
        if (!isAdmin) return;

        // Mark all messages from this user as read
        await (supabase
            .from("messages") as any)
            .update({ read: true })
            .eq("sender_id", senderId)
            .is("receiver_id", null)
            .eq("read", false);

        await refreshUnreadCount();
    };

    useEffect(() => {
        if (!isAdmin) return;

        refreshUnreadCount();

        // Subscribe to NEW messages to admin
        console.log("Initializing Admin Message Subscription...");
        const channel = supabase
            .channel("admin-messages-notification")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    // Removing filter temporarily to debug: filter: "receiver_id=is.null",
                },
                async (payload) => {
                    console.log("DEBUG: Full Payload Received:", payload);
                    const newMessage = payload.new as any;

                    if (newMessage.receiver_id === null) {
                        console.log("Confirmed: New message for Admin!");
                        setUnreadCount((prev) => prev + 1);

                        // Fetch sender profile immediately
                        const { data: senderProfile } = await (supabase
                            .from("profiles") as any)
                            .select("id, nickname, nome, foto_perfil")
                            .eq("id", newMessage.sender_id)
                            .single();

                        if (senderProfile) {
                            setLatestSender(senderProfile as Profile);

                            // Show notification
                            toast(`Nova mensagem de ${senderProfile.nickname || "Usuário"}`, {
                                description: newMessage.content,
                                action: {
                                    label: "Responder",
                                    onClick: () => window.location.href = "/admin/messaging"
                                }
                            });
                        }
                    } else {
                        console.log("Ignored: Message not for admin (receiver_id is not null)", newMessage.receiver_id);
                    }
                }
            )
            .subscribe((status) => {
                console.log("Subscription Status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin]);

    return (
        <UnreadMessagesContext.Provider value={{ unreadCount, latestSender, refreshUnreadCount, markAsRead }}>
            {children}
        </UnreadMessagesContext.Provider>
    );
}

export function useUnreadMessages() {
    const context = useContext(UnreadMessagesContext);
    if (context === undefined) {
        throw new Error("useUnreadMessages must be used within a UnreadMessagesProvider");
    }
    return context;
}
