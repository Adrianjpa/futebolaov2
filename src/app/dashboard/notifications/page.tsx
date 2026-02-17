"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Bell, Check, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
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
                .limit(50); // Get more history

            if (error) throw error;
            setNotifications(data as Notification[]);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            // Optimistic
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            await (supabase.from("notifications") as any).update({ read: true }).eq("id", id);
        } catch (error) {
            console.error("Error marking read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            await (supabase.from("notifications") as any).update({ read: true }).eq("user_id", user?.id).eq("read", false);
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    };

    const simulateNotification = async () => {
        if (!user) return;
        try {
            await (supabase.from("notifications") as any).insert({
                user_id: user.id,
                title: "Teste de Notificação",
                message: `Esta é uma notificação de teste enviada em ${new Date().toLocaleTimeString()}`,
                type: "info",
                link: "/dashboard",
                read: false
            });
            // Refresh list
            fetchNotifications();
        } catch (error) {
            console.error("Error simulating notification:", error);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        if (notif.link) {
            router.push(notif.link);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold">Minhas Notificações</h1>
                </div>
                <Button onClick={simulateNotification} variant="outline" size="sm">
                    Simular Notificação
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">Histórico</CardTitle>
                    {notifications.some(n => !n.read) && (
                        <Button variant="outline" size="sm" onClick={markAllAsRead}>
                            <Check className="mr-2 h-4 w-4" /> Marcar tudo como lido
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Carregando notificações...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                            <Bell className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-semibold">Nenhuma notificação</p>
                            <p className="text-sm opacity-70">Você está atualizado!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`relative flex flex-col gap-2 p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${!notif.read ? "bg-muted/30 border-primary/50 shadow-sm" : "bg-card border-border"
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            {!notif.read && (
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                            <h3 className={`font-semibold ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                                                {notif.title}
                                            </h3>
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${!notif.read ? "text-foreground/90" : "text-muted-foreground"}`}>
                                        {notif.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
