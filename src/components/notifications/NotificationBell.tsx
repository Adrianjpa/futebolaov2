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
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    type: string;
    link?: string;
    meta?: any;
}

export function NotificationBell() {
    const { user } = useAuth();
    const router = useRouter();
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
                    setNotifications(prev => [newNotif, ...prev].slice(0, 5));

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
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) throw error;

            const { count } = await supabase
                .from("notifications")
                .select("*", { count: 'exact', head: true })
                .eq("user_id", user.id)
                .eq("read", false);

            setNotifications(data as Notification[]);
            setUnreadCount(count || 0);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        if (!user) return;
        try {
            const wasUnread = notifications.find(n => n.id === id && !n.read);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

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
            // Updating UI state optimistically
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            await (supabase.from("notifications") as any)
                .update({ read: true })
                .eq("user_id", user.id)
                .eq("read", false);
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        setIsOpen(false);
        if (notif.link) {
            router.push(notif.link);
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
                            Marcar lidas
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-8 gap-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-xs">Carregando...</span>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">Nenhuma notificação</p>
                            <p className="text-xs opacity-70">Você está em dia!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`relative flex flex-col gap-1 p-4 text-sm transition-colors hover:bg-muted/50 cursor-pointer ${!notif.read ? "bg-muted/30 border-l-2 border-primary" : "border-l-2 border-transparent"}`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <span className={`font-semibold ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                                            {notif.title}
                                        </span>
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
                </div>
                <div className="p-2 border-t bg-muted/20">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => {
                            setIsOpen(false);
                            router.push("/dashboard/notifications");
                        }}
                    >
                        Ver todas as notificações
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
