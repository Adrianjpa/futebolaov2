"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient, Tables } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ArrowRight, Loader2, Activity, History } from "lucide-react";
import Link from "next/link";
import { isPast, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";

import { useMatches } from "@/contexts/MatchesContext";

export default function DashboardClient() {
    const { user, profile } = useAuth();
    const {
        matches: allActiveMatches,
        championshipsMap,
        userPredictions,
        loading: matchesLoading,
        refreshMatches: fetchMatches
    } = useMatches();

    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [nextMatches, setNextMatches] = useState<any[]>([]);
    const [recentMatches, setRecentMatches] = useState<any[]>([]);
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    const supabase = createClient();
    const isAdmin = profile?.funcao === "admin";

    // 1. Fetch Users & Ranking (Specific to Dashboard)
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // Fetch All Users (public_profiles)
                const { data: usersData } = await (supabase.from("public_profiles").select("*") as any);
                setAllUsers(usersData || []);

                // Fetch Top Users (Ranking View)
                const { data: rankingData } = await (supabase
                    .from("ranking_live") as any)
                    .select("*")
                    .order("total_points", { ascending: false })
                    .limit(5);
                setTopUsers(rankingData || []);

                // Fetch Recent Results
                const { data: recent } = await (supabase
                    .from("matches") as any)
                    .select("*")
                    .eq("status", "finished")
                    .order("date", { ascending: false })
                    .limit(5);

                const formattedRecent = (recent as any[])?.map(m => ({
                    ...m,
                    homeScore: m.score_home,
                    awayScore: m.score_away,
                    championshipName: championshipsMap[m.championship_id]?.name,
                    championshipLogoUrl: championshipsMap[m.championship_id]?.settings?.iconUrl
                })) || [];
                setRecentMatches(formattedRecent);

            } catch (error) {
                console.error("Error fetching dashboard specific data:", error);
            }
        };

        fetchData();

        // Ranking Realtime
        const rankingChannel = supabase
            .channel('dashboard-ranking')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, async () => {
                const { data: rankingData } = await (supabase
                    .from("ranking_live") as any)
                    .select("*")
                    .order("total_points", { ascending: false })
                    .limit(5);
                setTopUsers(rankingData || []);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(rankingChannel);
        };
    }, [user, supabase, championshipsMap]);

    // 2. Timer for live state updates
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    // 3. Derive Live and Next matches
    useEffect(() => {
        const live: any[] = [];
        const next: any[] = [];

        allActiveMatches.forEach(match => {
            const matchDate = parseISO(match.date);
            if (match.status === 'live' || (match.status === 'scheduled' && isPast(matchDate))) {
                live.push(match);
            } else if (match.status !== 'finished') {
                next.push(match);
            }
        });

        setLiveMatches(live);
        setNextMatches(next.slice(0, 5));
    }, [allActiveMatches, currentTime]);

    if (matchesLoading && allActiveMatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Carregando dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>

            {/* Live Matches Section */}
            {liveMatches.length > 0 ? (
                <Card className="border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/20 shadow-sm transition-all duration-300">
                    <CardHeader className="pb-3 border-b border-red-100 dark:border-red-900/30">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center text-red-600 dark:text-red-500 text-xl font-black">
                                <Activity className="mr-2 h-6 w-6 animate-pulse" />
                                AO VIVO
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-4">
                        {liveMatches.map((match) => (
                            <UnifiedMatchCard
                                key={match.id}
                                match={match}
                                live
                                showBetButton={!isAdmin}
                                hasPrediction={userPredictions.has(match.id)}
                                isAdmin={isAdmin}
                                onUpdate={fetchMatches}
                                users={allUsers}
                                showChampionshipName={true}
                            />
                        ))}
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium">Nenhum jogo ao vivo no momento.</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                {/* Main Content (Left) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Upcoming Matches */}
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-muted/10 pb-4 border-b">
                            <CardTitle className="flex items-center text-lg">
                                <Calendar className="mr-2 h-5 w-5 text-primary" />
                                Próximos Jogos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-4">
                            {nextMatches.length > 0 ? (
                                nextMatches.map((match) => (
                                    <UnifiedMatchCard
                                        key={match.id}
                                        match={match}
                                        showBetButton={!isAdmin}
                                        hasPrediction={userPredictions.has(match.id)}
                                        isAdmin={isAdmin}
                                        onUpdate={fetchMatches}
                                        users={allUsers}
                                        showChampionshipName={true}
                                    />
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-8 text-sm italic">Nenhum jogo agendado.</p>
                            )}
                            {nextMatches.length > 0 && (
                                <Link href="/dashboard/matches" className="w-full">
                                    <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                                        Ver todos os jogos <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Results */}
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-muted/10 pb-4 border-b">
                            <CardTitle className="flex items-center text-lg">
                                <History className="mr-2 h-5 w-5 text-muted-foreground" />
                                Resultados Recentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-4">
                            {recentMatches.length > 0 ? (
                                recentMatches.map((match) => (
                                    <UnifiedMatchCard
                                        key={match.id}
                                        match={match}
                                        finished
                                        showBetButton={false}
                                        hasPrediction={userPredictions.has(match.id)}
                                        isAdmin={isAdmin}
                                        onUpdate={fetchMatches}
                                        users={allUsers}
                                        showChampionshipName={true}
                                    />
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-8 text-sm italic">Nenhum resultado recente.</p>
                            )}
                            {recentMatches.length > 0 && (
                                <Link href="/dashboard/history" className="w-full">
                                    <Button variant="ghost" size="sm" className="w-full text-xs gap-2">
                                        Ver histórico completo <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar (Right) */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="overflow-hidden border-border dark:border-border/50 shadow-sm">
                        <CardHeader className="bg-muted/10 pb-4 border-b">
                            <CardTitle className="flex items-center text-lg">
                                <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                                Líderes por Campeonato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {Object.values(championshipsMap).filter((c: any) => c.status === 'ativo').map((champ: any) => {
                                // Simple mock ranking selection for now, view should be used
                                const leader = topUsers[0];

                                return (
                                    <div key={champ.id} className="relative p-4 rounded-xl bg-accent/20 border hover:border-primary/50 transition-all group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-primary/10 transition-colors" />

                                        <div className="flex flex-col gap-4 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                                                    {champ.name}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <Avatar className="h-16 w-16 border-2 border-yellow-500 shadow-lg ring-4 ring-yellow-500/20">
                                                        <AvatarImage src={leader?.foto_perfil} />
                                                        <AvatarFallback className="bg-yellow-500 text-white font-bold">
                                                            {(leader?.nickname || leader?.nome || "?").substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-background">
                                                        1º
                                                    </div>
                                                </div>

                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <Link href={`/dashboard/profile/${leader?.user_id}`} className="hover:underline decoration-primary underline-offset-4">
                                                        <p className="font-bold text-base truncate">{leader?.nickname || leader?.nome || "Sem competidor"}</p>
                                                    </Link>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xl font-black text-primary font-mono">{leader?.total_points || 0}</span>
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">pontos</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Link href={`/dashboard/ranking?championship=${champ.id}`}>
                                                <Button size="sm" className="w-full h-8 text-xs font-bold rounded-lg group/btn">
                                                    Ver Ranking Completo
                                                    <ArrowRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.values(championshipsMap).filter((c: any) => c.status === 'ativo').length === 0 && (
                                <div className="text-center py-6">
                                    <p className="text-sm text-muted-foreground">Nenhum campeonato ativo.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
