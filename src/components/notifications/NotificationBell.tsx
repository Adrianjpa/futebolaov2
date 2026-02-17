"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    type: string;
    meta?: any;
}

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('notifications_schema')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    if (!newNotif.read) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false }) // Show newest first
                .limit(20);

            if (error) throw error;

            const notifs = data as Notification[];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        if (!user) return;
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await (supabase.from("notifications") as any)
                .update({ read: true })
                .eq("id", id);
        } catch (error) {
            console.error("Error marking read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (!user || unreadCount === 0) return;
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
            if (unreadIds.length === 0) return;

            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            await (supabase.from("notifications") as any)
                .update({ read: true })
                .in("id", unreadIds);
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group">
                    <Bell className={`h-5 w-5 transition-transform group-hover:scale-110 ${unreadCount > 0 ? "text-primary fill-primary/20 animate-pulse-slow" : "text-muted-foreground"}`} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-background"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">Notificações</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:text-primary/80 h-auto p-0 px-2"
                        >
                            Marcar todas como lidas
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-xs">Carregando...</span>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">Nenhuma notificação</p>
                            <p className="text-xs opacity-70">Você está em dia!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`relative flex flex-col gap-1 p-4 text-sm transition-colors hover:bg-muted/50 ${!notif.read ? "bg-muted/30 border-l-2 border-primary" : "border-l-2 border-transparent"}`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <span className={`font-semibold ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                                            {notif.title}
                                        </span>
                                        {!notif.read && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 -mt-1 -mr-2 text-muted-foreground hover:text-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notif.id);
                                                }}
                                                title="Marcar como lida"
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className={`text-xs ${!notif.read ? "text-foreground/90" : "text-muted-foreground"}`}>
                                        {notif.message}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                {/* Footer if needed */}
            </PopoverContent>
        </Popover>
    );
}
