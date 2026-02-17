"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Loader2, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminNotificationsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Broadcast State
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
    const [target, setTarget] = useState<"all" | "active">("all");

    // Reminder State
    const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    useEffect(() => {
        fetchUpcomingMatches();
    }, []);

    const fetchUpcomingMatches = async () => {
        setLoadingMatches(true);
        try {
            const now = new Date().toISOString();
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from("matches")
                .select(`
                    id, 
                    date, 
                    home_team, 
                    away_team, 
                    championship:championships(name)
                `)
                .gte("date", now)
                .lte("date", tomorrow)
                .order("date", { ascending: true });

            if (error) throw error;
            setUpcomingMatches(data || []);
        } catch (error) {
            console.error("Error fetching matches:", error);
            toast.error("Erro ao carregar jogos próximos.");
        } finally {
            setLoadingMatches(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Preencha título e mensagem.");
            return;
        }

        setLoading(true);
        try {
            // Fetch users (all or active only logic could be added)
            const { data: users, error: usersError } = await supabase
                .from("profiles")
                .select("id");

            if (usersError) throw usersError;
            if (!users || users.length === 0) {
                toast.warning("Nenhum usuário encontrado.");
                return;
            }

            const notifications = users.map((user: any) => ({
                user_id: user.id,
                title,
                message,
                type,
                read: false,
                created_at: new Date().toISOString(),
                link: target === 'all' ? '/dashboard' : undefined // Link generic
            }));

            const { error } = await (supabase.from("notifications") as any).insert(notifications);

            if (error) throw error;

            toast.success(`Notificação enviada para ${users.length} usuários!`);
            setTitle("");
            setMessage("");
        } catch (error) {
            console.error("Error sending broadcast:", error);
            toast.error("Erro ao enviar notificação.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = async (matchId: string, matchTitle: string) => {
        setLoading(true);
        try {
            // 1. Get all users who haven't predicted for this match
            // This is a bit complex. easier to get all predictions for match, then exclusion.

            // Get all profiles
            const { data: allUsers } = await supabase.from("profiles").select("id");
            if (!allUsers) return;

            // Get existing predictions
            const { data: predictions } = await supabase
                .from("predictions")
                .select("user_id")
                .eq("match_id", matchId);

            const predictedUserIds = new Set((predictions || []).map((p: any) => p.user_id));

            const usersToRemind = allUsers.filter((u: any) => !predictedUserIds.has(u.id));

            if (usersToRemind.length === 0) {
                toast.info("Todos os usuários já palpitaram neste jogo!");
                return;
            }

            const notifications = usersToRemind.map((user: any) => ({
                user_id: user.id,
                title: "Lembrete de Palpite ⚽",
                message: `O jogo ${matchTitle} começa em breve e você ainda não palpitou!`,
                type: "warning",
                read: false,
                link: `/dashboard/matches?highlight=${matchId}`, // Need to handle highlight in matches page eventually
                created_at: new Date().toISOString()
            }));

            const { error } = await (supabase.from("notifications") as any).insert(notifications);

            if (error) throw error;

            toast.success(`Lembrete enviado para ${usersToRemind.length} usuários pendentes!`);

        } catch (error) {
            console.error("Error sending reminder:", error);
            toast.error("Erro ao enviar lembretes.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Bell className="h-8 w-8 text-primary" />
                    Central de Notificações
                </h1>
                <p className="text-muted-foreground">Envie comunicados e lembretes para os usuários do sistema.</p>
            </div>

            <Tabs defaultValue="broadcast" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="broadcast">Comunicado Geral</TabsTrigger>
                    <TabsTrigger value="reminders">Lembretes de Jogos</TabsTrigger>
                </TabsList>

                {/* Broadcast Tab */}
                <TabsContent value="broadcast" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Enviar Comunicado</CardTitle>
                            <CardDescription>Envie avisos de manutenção, novidades ou mensagens importantes para todos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Título</label>
                                <Input
                                    placeholder="Ex: Manutenção Programada"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mensagem</label>
                                <Textarea
                                    placeholder="Digite o conteúdo da notificação..."
                                    rows={4}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="info">Informação (Azul)</SelectItem>
                                            <SelectItem value="success">Sucesso (Verde)</SelectItem>
                                            <SelectItem value="warning">Aviso (Amarelo)</SelectItem>
                                            <SelectItem value="error">Erro/Crítico (Vermelho)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Destinatários</label>
                                    <Select value={target} onValueChange={(v: any) => setTarget(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Usuários</SelectItem>
                                            {/* Future: Add specific groups */}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button onClick={handleSendBroadcast} disabled={loading} className="w-full mt-4">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Enviar Notificação
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reminders Tab */}
                <TabsContent value="reminders" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lembretes de Jogos Próximos (24h)</CardTitle>
                            <CardDescription>Notifique apenas os usuários que ainda NÃO palpitaram nestes jogos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingMatches ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                            ) : upcomingMatches.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    Nenhum jogo nas próximas 24h.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingMatches.map((match) => (
                                        <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <Calendar className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold flex items-center gap-2">
                                                        {match.home_team} <span className="text-xs text-muted-foreground">vs</span> {match.away_team}
                                                    </h4>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>{match.championship?.name}</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(match.date), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSendReminder(match.id, `${match.home_team} vs ${match.away_team}`)}
                                                disabled={loading}
                                            >
                                                <Bell className="mr-2 h-3 w-3" />
                                                Notificar Pendentes
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
