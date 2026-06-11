"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ArrowRight, Loader2, Activity, History, Info, X } from "lucide-react";
import Link from "next/link";
import { isPast, parseISO, differenceInDays, format as formatDate, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";
import { Countdown } from "@/components/ui/countdown";
import { LeaderConfetti } from "@/components/effects/LeaderConfetti";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useMatches } from "@/contexts/MatchesContext";

export default function DashboardClient() {
    const { user, profile } = useAuth();
    const {
        matches: allActiveMatches,
        championships: allChampionships,
        championshipsMap,
        userPredictions,
        userParticipation,
        userAcceptedRules,
        globalPhaseRules,
        globalComboUsage,
        loading: matchesLoading,
        refreshMatches: fetchMatches
    } = useMatches();

    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [nextMatches, setNextMatches] = useState<any[]>([]);
    const [recentMatches, setRecentMatches] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [localAcceptedRules, setLocalAcceptedRules] = useState<Set<string>>(new Set());
    // const [topUsers, setTopUsers] = useState<any[]>([]); // Deprecated for global simple list
    const [leadersMap, setLeadersMap] = useState<Record<string, any>>({});
    const [announcement, setAnnouncement] = useState<string>("");
    const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string>("");
    const [currentTime, setCurrentTime] = useState(new Date());

    const [showRulesModal, setShowRulesModal] = useState(false);
    const [selectedRulesChamp, setSelectedRulesChamp] = useState<any>(null);
    const [acceptingRules, setAcceptingRules] = useState(false);

    const supabase = createClient();
    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    // 1. Fetch Users, Ranking & System Settings
    useEffect(() => {
        if (!user) return;
        
        const storedDismiss = localStorage.getItem("dismissedDashboardAnnouncement");
        if (storedDismiss) setDismissedAnnouncement(storedDismiss);

        const fetchData = async () => {
            try {
                // Fetch System Settings (Announcement)
                const { data: settingsData } = await (supabase.from("system_settings").select("data").eq("id", "config").single() as any);
                if (settingsData?.data?.announcement) {
                    setAnnouncement(settingsData.data.announcement);
                }

                // Fetch All Users (public_profiles) via API to bypass RLS
                const res = await fetch('/api/users/public');
                if (res.ok) {
                    const json = await res.json();
                    setAllUsers(json.data || []);
                } else {
                    const { data: usersData } = await (supabase.from("public_profiles").select("*") as any);
                    setAllUsers(usersData || []);
                }

                // Fetch Leaders for Active Championships
                // We use 'ranking_by_championship' view which splits points by championship
                const activeChampIds = Object.values(championshipsMap)
                    .filter((c: any) => c.status === 'ativo')
                    .map((c: any) => c.id);

                if (activeChampIds.length > 0) {
                    const { data: rankingData } = await (supabase
                        .from("ranking_by_championship") as any)
                        .select("*")
                        .in("championship_id", activeChampIds);

                    const newLeadersMap: Record<string, any> = {};

                    if (rankingData) {
                        const grouped: Record<string, any[]> = {};
                        rankingData.forEach((row: any) => {
                            if (!grouped[row.championship_id]) grouped[row.championship_id] = [];
                            grouped[row.championship_id].push(row);
                        });

                        for (const champId of activeChampIds) {
                            const rows = grouped[champId] || [];
                            if (rows.length > 0) {
                                rows.sort((a, b) => {
                                    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                                    if (b.exact_scores !== a.exact_scores) return (b.exact_scores || 0) - (a.exact_scores || 0);
                                    if (b.outcomes !== a.outcomes) return (b.outcomes || 0) - (a.outcomes || 0);
                                    if (b.errors !== a.errors) return (a.errors || 0) - (b.errors || 0);
                                    return (a.nickname || a.nome || "").localeCompare(b.nickname || b.nome || "");
                                });
                                newLeadersMap[champId] = rows[0];
                            }
                        }
                    }
                    setLeadersMap(newLeadersMap);
                }

                // Fetch Recent Results
                const { data: recent } = await (supabase
                    .from("matches") as any)
                    .select("*")
                    .eq("status", "finished")
                    .order("date", { ascending: false })
                    .order("round", { ascending: false })
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
                // Re-fetch logic (simplified clone of above)
                // ideally refactor to function, but okay for now
                const activeChampIds = Object.values(championshipsMap)
                    .filter((c: any) => c.status === 'ativo')
                    .map((c: any) => c.id);

                if (activeChampIds.length > 0) {
                    const { data: rankingData } = await (supabase
                        .from("ranking_by_championship") as any)
                        .select("*")
                        .in("championship_id", activeChampIds);

                    const newLeadersMap: Record<string, any> = {};

                    if (rankingData) {
                        const grouped: Record<string, any[]> = {};
                        rankingData.forEach((row: any) => {
                            if (!grouped[row.championship_id]) grouped[row.championship_id] = [];
                            grouped[row.championship_id].push(row);
                        });

                        for (const champId of activeChampIds) {
                            const rows = grouped[champId] || [];
                            if (rows.length > 0) {
                                rows.sort((a, b) => {
                                    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                                    if (b.exact_scores !== a.exact_scores) return (b.exact_scores || 0) - (a.exact_scores || 0);
                                    if (b.outcomes !== a.outcomes) return (b.outcomes || 0) - (a.outcomes || 0);
                                    if (b.errors !== a.errors) return (a.errors || 0) - (b.errors || 0);
                                    return (a.nickname || a.nome || "").localeCompare(b.nickname || b.nome || "");
                                });
                                newLeadersMap[champId] = rows[0];
                            }
                        }
                    }
                    setLeadersMap(newLeadersMap);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(rankingChannel);
        };
    }, [user, supabase, championshipsMap]);

    // 2. Timer for live state updates
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 3. Derive Live and Next matches
    useEffect(() => {
        const live: any[] = [];
        const next: any[] = [];

        allActiveMatches.forEach(match => {
            // Filter by participation if not admin
            if (!isAdmin && !userParticipation.has(match.championship_id)) return;

            // Do not show matches of scheduled (agendado) championships to regular users
            const champ = championshipsMap[match.championship_id];
            if (!isAdmin && champ?.status === 'agendado') return;

            const matchDate = parseISO(match.date);
            if (match.status === 'live' || (match.status === 'scheduled' && isPast(matchDate))) {
                live.push(match);
            } else if (match.status !== 'finished') {
                next.push(match);
            }
        });

        setLiveMatches(live);
        setNextMatches(next.slice(0, 5));
    }, [allActiveMatches, currentTime, isAdmin, userParticipation]);

    // 4. Filter recent matches by participation
    const filteredRecent = recentMatches.filter(m => isAdmin || userParticipation.has(m.championship_id));

    // 5. Calculate Upcoming Championships for the user
    const upcomingChampionships = Array.from(userParticipation)
        .map(id => championshipsMap[id])
        .filter(c => c && (c.status === 'ativo' || c.status === 'agendado' || isAdmin))
        .map(c => {
            // Robust check: Use start_date if available
            if (c.start_date) {
                const startDate = parseISO(c.start_date);
                // If start date is in the past (and not just today), it has started.
                // We add a small buffer or just strict comparison.
                if (isPast(startDate)) return null;

                return {
                    ...c,
                    earliestMatchDate: startDate,
                    matchCount: 0 // Not needed for banner really
                };
            }

            // Fallback: If no start_date...
            // Try to infer from matches
            const champMatches = allActiveMatches.filter(m => m.championship_id === c.id);
            const hasStarted = champMatches.some(m => m.status === 'live' || m.status === 'finished' || isPast(parseISO(m.date)));

            if (hasStarted) return null;

            const earliestMatch = [...champMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

            if (!earliestMatch) {
                // If no matches and status is 'ativo', we assume it's active but empty, so don't show countdown
                if (c.status === 'ativo') return null;
                return null;
            }

            return {
                ...c,
                earliestMatchDate: parseISO(earliestMatch.date),
                matchCount: champMatches.length
            };
        })
        .filter(c => c !== null)
        .sort((a, b) => {
            if (!a.earliestMatchDate) return 1;
            if (!b.earliestMatchDate) return -1;
            return a.earliestMatchDate.getTime() - b.earliestMatchDate.getTime();
        });

    // 6. Urgency Notification for Matches < 2h
    const hasShownUrgencyToast = useRef(false);

    // Stable reference for nextMatches to prevent dependency array size issues
    const nextMatchesIds = nextMatches.map(m => m.id).join(',');

    useEffect(() => {
        if (matchesLoading || nextMatches.length === 0 || isAdmin) return;

        const now = new Date();
        const urgentMatches = nextMatches.filter(match => {
            const matchDate = parseISO(match.date);
            const minutesToStart = differenceInMinutes(matchDate, now);
            const hasPrediction = userPredictions.has(match.id);
            return !hasPrediction && minutesToStart > 0 && minutesToStart <= 120;
        });

        if (urgentMatches.length > 0 && !hasShownUrgencyToast.current) {
            toast("Palpite Pendente!", {
                description: `Você tem ${urgentMatches.length} jogo(s) começando em breve. Não esqueça de palpitar!`,
                action: {
                    label: "Preencher Agora",
                    onClick: () => {
                        const element = document.getElementById("upcoming-matches-section");
                        if (element) element.scrollIntoView({ behavior: "smooth" });
                    }
                },
                duration: 10000,
            });
            hasShownUrgencyToast.current = true;
        }
        // Using string dependency instead of array object to prevent "size changed" errors
    }, [nextMatchesIds, userPredictions, matchesLoading, isAdmin]);

    const handleAcceptRules = async () => {
        if (!selectedRulesChamp || !user) return;
        setAcceptingRules(true);
        try {
            const { error } = await (supabase
                .from('championship_participants') as any)
                .upsert({ 
                    user_id: user.id, 
                    championship_id: selectedRulesChamp.id,
                    has_accepted_rules: true 
                }, { onConflict: 'user_id, championship_id' });
            
            if (error) throw error;
            
            await fetchMatches(); 
            setLocalAcceptedRules(prev => new Set([...prev, selectedRulesChamp.id]));
            setShowRulesModal(false);
            toast.success("Regras aceitas com sucesso!", {
                description: "Você pode reler este regulamento a qualquer momento clicando no botão de 'Informação' na aba PARTIDAS.",
                duration: 8000
            });
        } catch (error) {
            console.error("Error accepting rules:", error);
            toast.error("Ocorreu um erro ao aceitar as regras.");
        } finally {
            setAcceptingRules(false);
        }
    };

    const upcomingChampionship = upcomingChampionships[0];

    const activeChampsCount = allChampionships.filter(c => c.status === 'ativo' || c.status === 'agendado').length;
    const userActiveChampsCount = Array.from(userParticipation).filter(id => {
        const status = championshipsMap[id]?.status;
        return status === 'ativo' || status === 'agendado';
    }).length;

    if (matchesLoading && allActiveMatches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-bold text-foreground">Prepare-se para o jogo!</h2>
                <p className="text-sm text-muted-foreground font-medium  mt-1">Carregando seus dados...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Top Bar / Status Section */}
            <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                </div>

                {/* System Announcement Banner */}
                {announcement && announcement !== dismissedAnnouncement && (
                    <div className="bg-primary/10 border border-primary/20 text-primary-foreground p-4 rounded-xl flex items-start gap-3 shadow-sm relative pr-10">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-primary uppercase tracking-wide mb-1">Comunicado Oficial</p>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{announcement}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-3 right-3 h-6 w-6 rounded-full hover:bg-primary/20 text-primary shrink-0"
                            onClick={() => {
                                localStorage.setItem("dismissedDashboardAnnouncement", announcement);
                                setDismissedAnnouncement(announcement);
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Confetti Animation for Leaders - REMOVED AS REQUESTED */}
                {/* <LeaderConfetti leadersMap={leadersMap} championshipsMap={championshipsMap} /> */}
            </div>

            {/* Dashboard Alerts / Empty States for Users */}
            {!isAdmin && (
                <div className="space-y-4">
                    {activeChampsCount === 0 ? (
                        <div className="text-center py-10 bg-yellow-500/5 border border-yellow-500/20 border-dashed rounded-2xl">
                            <Info className="h-10 w-10 mx-auto mb-3 text-yellow-500/50" />
                            <h3 className="text-sm font-bold text-yellow-700 dark:text-yellow-400">Nenhum campeonato em andamento</h3>
                            <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-1">Para maiores informações, contate o ADMIN.</p>
                        </div>
                    ) : userActiveChampsCount === 0 ? (
                        <div className="text-center py-10 bg-blue-500/5 border border-blue-500/20 border-dashed rounded-2xl">
                            <Trophy className="h-10 w-10 mx-auto mb-3 text-blue-500/50" />
                            <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">Você ainda não entrou no jogo</h3>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Participe de um campeonato para começar a ganhar pontos!</p>
                        </div>
                    ) : null}

                    {upcomingChampionship && (() => {
                        const hasRules = !!(upcomingChampionship.settings as any)?.rulesText;
                        const hasAccepted = userAcceptedRules.has(upcomingChampionship.id) || localAcceptedRules.has(upcomingChampionship.id);
                        const isLocked = !isAdmin && hasRules && !hasAccepted;

                        const CardContentWrapper = ({ children }: any) => (
                            <Card className={`border-primary/30  ${isLocked ? 'bg-slate-900/80 border-dashed hover:border-primary/50 cursor-pointer' : 'bg-gradient-to-r from-primary/20 to-primary/5'}`}>
                                <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-6 text-center sm:text-left">
                                    {children}
                                </CardContent>
                            </Card>
                        );

                        const innerContent = (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border   overflow-hidden p-2 ${isLocked ? 'bg-slate-800 border-slate-700' : 'bg-primary/10 border-primary/20'}`}>
                                        {(upcomingChampionship.settings as any)?.iconUrl || (upcomingChampionship as any).icon_url ? (
                                            <img
                                                src={(upcomingChampionship.settings as any)?.iconUrl || (upcomingChampionship as any).icon_url}
                                                alt={upcomingChampionship.name}
                                                className={`h-full w-full object-contain ${isLocked ? 'grayscale opacity-50' : ''}`}
                                            />
                                        ) : (
                                            <Trophy className={`h-8 w-8 ${isLocked ? 'text-slate-500' : 'text-primary'}`} />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className={`text-lg font-black uppercase tracking-tight ${isLocked ? 'text-slate-300' : 'text-foreground'}`}>
                                            {isLocked 
                                                ? "Ação Necessária"
                                                : upcomingChampionship.earliestMatchDate
                                                    ? "Prepare-se para o lançamento!"
                                                    : "Campeonato em Breve!"
                                            }
                                        </h3>
                                        <p className="text-sm text-muted-foreground font-medium">
                                            {isLocked
                                                ? <>Você foi convocado para <span className="text-primary font-bold">{upcomingChampionship.name}</span>. Leia o regulamento.</>
                                                : upcomingChampionship.earliestMatchDate
                                                    ? <>Você está inscrito! O torneio <span className="text-primary font-bold">{upcomingChampionship.name}</span> vai começar em:</>
                                                    : <>O campeonato <span className="text-primary font-bold">{upcomingChampionship.name}</span> está sendo preparado.</>
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center sm:items-end gap-1">
                                    {isLocked ? (
                                        <Button variant="default" className="font-bold uppercase tracking-wider text-xs shadow-sm ">
                                            Ler Regulamento
                                        </Button>
                                    ) : upcomingChampionship.earliestMatchDate ? (
                                        <div className="flex justify-end w-full sm:w-auto mt-2 sm:mt-0">
                                            <Countdown targetDate={upcomingChampionship.earliestMatchDate} variant="block" />
                                        </div>
                                    ) : (
                                        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest border border-primary/20 ">
                                            Aguardando Tabela
                                        </div>
                                    )}
                                </div>
                            </>
                        );

                        if (isLocked) {
                            return (
                                <div onClick={() => { setSelectedRulesChamp(upcomingChampionship); setShowRulesModal(true); }}>
                                    <CardContentWrapper>{innerContent}</CardContentWrapper>
                                </div>
                            );
                        }

                        // Render countdown banner for users who have accepted rules (or no rules required)
                        return <CardContentWrapper>{innerContent}</CardContentWrapper>;
                    })()}
                </div>
            )}

            {/* Segue o Líder Banners */}
            {(() => {
                const activeChampsForLeader = isAdmin 
                    ? Object.values(championshipsMap).filter((c: any) => c.status === 'ativo').map((c: any) => c.id)
                    : Array.from(userParticipation).filter(id => championshipsMap[id]?.status === 'ativo');

                if (activeChampsForLeader.length === 0) return null;

                return (
                    <div className="space-y-4">
                        {activeChampsForLeader.map(champId => {
                            const champ = championshipsMap[champId];
                            const leader = leadersMap[champId];
                            if (!champ || !leader) return null;

                            return (
                                <div key={`leader-${champId}`} className="bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-orange-500/20 border border-yellow-500/40 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-sm">
                                    <div className="absolute top-0 right-0 -mt-6 -mr-6 text-yellow-500/10 z-0">
                                        <Trophy className="w-32 h-32" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full sm:w-auto">
                                        <div className="relative shrink-0">
                                            <Avatar className="h-20 w-20 border-4 border-yellow-500/80 shadow-xl">
                                                <AvatarImage src={leader.foto_perfil} className="object-cover" />
                                                <AvatarFallback className="bg-yellow-100 text-yellow-800 text-2xl font-black">
                                                    {(leader.nickname?.charAt(0) || leader.nome?.charAt(0) || 'U').toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-yellow-950 p-1.5 rounded-full shadow-lg border-2 border-background">
                                                <Trophy className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col text-center sm:text-left">
                                            <div className="text-yellow-600 dark:text-yellow-400 font-black tracking-widest uppercase text-[10px] sm:text-xs mb-1 flex items-center justify-center sm:justify-start gap-1">
                                                <Activity className="h-3 w-3" /> SEGUE O LÍDER • {champ.name}
                                            </div>
                                            <div className="text-xl sm:text-2xl font-black text-foreground uppercase truncate max-w-[250px] sm:max-w-[400px]">
                                                {leader.nickname || leader.nome}
                                            </div>
                                            <div className="text-sm font-medium text-muted-foreground mt-0.5">
                                                <span className="text-foreground font-bold text-lg">{leader.total_points}</span> pts
                                            </div>
                                        </div>
                                    </div>
                                    <div className="z-10 w-full sm:w-auto mt-2 sm:mt-0">
                                        <Link href="/dashboard/ranking" prefetch={false} className="w-full">
                                            <Button className="w-full sm:w-auto font-bold uppercase tracking-wider text-xs h-10 shadow-md bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 hover:from-yellow-400 hover:to-amber-400 border-none transition-all hover:scale-105">
                                                Ver Ranking
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Live Matches Section */}
            {(liveMatches.length > 0 || isAdmin) && (
                liveMatches.length > 0 ? (
                    <Card className="border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/20">
                        <CardHeader className="pb-3 border-b border-red-100 dark:border-red-900/30">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center text-red-600 dark:text-red-500 text-xl font-black">
                                    <Activity className="mr-2 h-6 w-6 " />
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
                                    teamMode={championshipsMap[match.championship_id]?.settings?.teamMode || 'clubes'}
                                    comboEnabled={!!championshipsMap[match.championship_id]?.settings?.comboEnabled}
                                    totalPhaseTokens={
                                        globalPhaseRules[match.championship_id]?.[match.round_name || match.round.toString()] || 
                                        championshipsMap[match.championship_id]?.settings?.defaultComboTokens || 0
                                    }
                                    availableComboTokens={Math.max(0, 
                                        (globalPhaseRules[match.championship_id]?.[match.round_name || match.round.toString()] || championshipsMap[match.championship_id]?.settings?.defaultComboTokens || 0) - 
                                        (globalComboUsage[match.championship_id]?.[match.round_name || match.round.toString()] || 0)
                                    )}
                                />
                            ))}
                        </CardContent>
                    </Card>
                ) : isAdmin ? (
                    <div className="text-center py-8 bg-card/30 border border-dashed rounded-xl">
                        <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                        <p className="text-sm font-medium text-muted-foreground">Nenhum jogo ao vivo no momento.</p>
                    </div>
                ) : null
            )}

            {(isAdmin || userActiveChampsCount > 0) && (
                <div className="space-y-6 w-full">
                        {/* Upcoming Matches */}
                        <Card className="overflow-hidden" id="upcoming-matches-section">
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
                                            teamMode={championshipsMap[match.championship_id]?.settings?.teamMode || 'clubes'}
                                            comboEnabled={!!championshipsMap[match.championship_id]?.settings?.comboEnabled}
                                            totalPhaseTokens={
                                                globalPhaseRules[match.championship_id]?.[match.round_name || match.round.toString()] || 
                                                championshipsMap[match.championship_id]?.settings?.defaultComboTokens || 0
                                            }
                                            availableComboTokens={Math.max(0, 
                                                (globalPhaseRules[match.championship_id]?.[match.round_name || match.round.toString()] || championshipsMap[match.championship_id]?.settings?.defaultComboTokens || 0) - 
                                                (globalComboUsage[match.championship_id]?.[match.round_name || match.round.toString()] || 0)
                                            )}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-card/5 border border-dashed rounded-xl">
                                        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                                        <p className="text-sm text-muted-foreground italic">Nenhum jogo agendado.</p>
                                    </div>
                                )}
                                {nextMatches.length > 0 && (
                                    <Link href="/dashboard/matches" className="w-full" prefetch={false}>
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
                                    Últimos Resultados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 pt-4">
                                {filteredRecent.length > 0 ? (
                                    filteredRecent.map((match) => (
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
                                            teamMode={championshipsMap[match.championship_id]?.settings?.teamMode || 'clubes'}
                                            comboEnabled={!!championshipsMap[match.championship_id]?.settings?.comboEnabled}
                                            totalPhaseTokens={
                                                globalPhaseRules[match.championship_id]?.[match.round_name || match.round.toString()] || 
                                                championshipsMap[match.championship_id]?.settings?.defaultComboTokens || 0
                                            }
                                            availableComboTokens={Math.max(0, 
                                                (globalPhaseRules[match.championship_id]?.[match.round_name || match.round.toString()] || championshipsMap[match.championship_id]?.settings?.defaultComboTokens || 0) - 
                                                (globalComboUsage[match.championship_id]?.[match.round_name || match.round.toString()] || 0)
                                            )}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 bg-card/5 border border-dashed rounded-xl">
                                        <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                                        <p className="text-sm text-muted-foreground italic">Nenhum resultado recente.</p>
                                    </div>
                                )}
                                {filteredRecent.length > 0 && (
                                    <Link href="/dashboard/history" className="w-full" prefetch={false}>
                                        <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                                            Ver histórico completo <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                </div>
            )}

            {/* Rules Modal */}
            <Dialog open={showRulesModal} onOpenChange={setShowRulesModal}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col bg-background border-border shadow-sm">
                    <DialogHeader>
                        <div className="flex items-center justify-center mb-4 mt-2">
                            {(selectedRulesChamp?.settings as any)?.iconUrl || selectedRulesChamp?.icon_url ? (
                                <img
                                    src={(selectedRulesChamp.settings as any)?.iconUrl || selectedRulesChamp.icon_url}
                                    alt="Logo"
                                    className="h-16 w-16 object-contain"
                                />
                            ) : (
                                <Trophy className="h-12 w-12 text-primary" />
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-black text-center uppercase tracking-tight text-foreground">
                            Regulamento Oficial
                        </DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground font-medium">
                            {selectedRulesChamp?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-4">
                        <div className="bg-muted border border-border rounded-lg p-5">
                            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                                {(selectedRulesChamp?.settings as any)?.rulesText || "Nenhum regulamento fornecido."}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
                        {userAcceptedRules.has(selectedRulesChamp?.id) ? (
                            <Button className="w-full" variant="outline" onClick={() => setShowRulesModal(false)}>
                                Fechar
                            </Button>
                        ) : (
                            <>
                                <p className="text-[10px] text-muted-foreground text-center mb-2">
                                    Ao clicar em aceitar, você concorda com todas as regras estabelecidas acima e se compromete a segui-las durante todo o torneio.
                                </p>
                                <Button 
                                    className="w-full font-bold uppercase tracking-wider h-12" 
                                    onClick={handleAcceptRules}
                                    disabled={acceptingRules}
                                >
                                    {acceptingRules ? <Loader2 className="h-5 w-5 animate-spin" /> : "Eu Li e Aceito as Regras"}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
