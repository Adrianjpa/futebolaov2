"use client";

import { useUnreadMessages } from "@/contexts/UnreadMessagesContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export function AdminChatBubble() {
    const { unreadCount, latestSender } = useUnreadMessages();
    const { profile } = useAuth();
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    useEffect(() => {
        if (unreadCount > 0) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [unreadCount]);

    if (!isAdmin || !isVisible) return null;

    return (
        <div
            className="fixed bottom-6 right-6 z-50 cursor-pointer group animate-in slide-in-from-bottom-5 duration-300"
            onClick={() => router.push("/admin/messaging")}
        >
            <div className="relative">
                {/* Notification Badge */}
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 z-20 h-6 w-6 flex items-center justify-center rounded-full border-2 border-background animate-bounce"
                >
                    {unreadCount}
                </Badge>

                {/* Main Bubble */}
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200 overflow-hidden ring-4 ring-background border-2 border-primary/20">
                    {latestSender ? (
                        <div className="relative h-full w-full">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={latestSender.foto_perfil || undefined} className="object-cover" />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                                    {(latestSender.nickname || latestSender.nome || "?").substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    ) : (
                        <MessageSquare className="h-8 w-8" />
                    )}
                </div>

                {/* Tooltip on Hover */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-sm font-medium">
                        {latestSender
                            ? `Nova mensagem de ${latestSender.nickname || latestSender.nome}`
                            : "Novas mensagens"}
                    </p>
                </div>
            </div>
        </div>
    );
}
