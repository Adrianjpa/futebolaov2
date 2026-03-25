"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase";
import { Crown, Medal, Trophy, Siren, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TEAM_ISO_MAP: Record<string, string> = {
    'Polônia': 'pl', 'Grécia': 'gr', 'Rússia': 'ru', 'República Tcheca': 'cz',
    'Holanda': 'nl', 'Dinamarca': 'dk', 'Alemanha': 'de', 'Portugal': 'pt',
    'Espanha': 'es', 'Itália': 'it', 'Irlanda': 'ie', 'Croácia': 'hr',
    'França': 'fr', 'Inglaterra': 'gb-eng', 'Ucrânia': 'ua', 'Suécia': 'se',
    'Brasil': 'br', 'Argentina': 'ar', 'Uruguai': 'uy', 'Bélgica': 'be',
    'Suíça': 'ch', 'México': 'mx', 'Colômbia': 'co', 'Japão': 'jp',
    'Senegal': 'sn', 'Marrocos': 'ma', 'Irã': 'ir', 'Egito': 'eg',
    'Arábia Saudita': 'sa', 'Austrália': 'au', 'Islândia': 'is', 'Peru': 'pe',
    'Nigéria': 'ng', 'Costa Rica': 'cr', 'Sérvia': 'rs', 'Coréia do Sul': 'kr',
    'Panamá': 'pa', 'Tunísia': 'tn', 'Turquia': 'tr', 'Áustria': 'at'
};

interface UserProfile {
    user_id: string;
    nome: string;
    nickname?: string;
    foto_perfil?: string;
    total_points: number;
    exact_scores: number;
    outcomes: number;
    errors: number;
}

interface Championship {
    id: string;
    name: string;
    status: string;
}

export default function RankingPage() {
    const { user: currentUser, profile } = useAuth();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const initialChampionshipId = searchParams.get("championship") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<any[]>([]);
    const [hasHistory, setHasHistory] = useState<boolean | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [selectedChampionship, setSelectedChampionship] = useState<string>(initialChampionshipId);
    const [sortBy, setSortBy] = useState<'total_points' | 'exact_scores' | 'outcomes'>('total_points');

    // Features for Flags
    const [officialRanking, setOfficialRanking] = useState<string[]>([]);
    const [enablePriority, setEnablePriority] = useState<boolean>(true);
    const [enableTiebreaker, setEnableTiebreaker] = useState<boolean>(false);
    const [participantsData, setParticipantsData] = useState<Map<string, string[]>>(new Map());

    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    useEffect(() => {
        const fetchInitial = async () => {
            if (!currentUser) return;

            // 1. Fetch ALL championships
            const { data: champs } = await (supabase.from("championships") as any)
                .select("*")
                .order("created_at", { ascending: false });

            const allChamps = champs || [];
            setChampionships(allChamps);

            // 2. Determine Participation History
            const { data: participation } = await (supabase.from("championship_participants") as any)
                .select("championship_id")
                .eq("user_id", currentUser.id);

            const participatedIds = (participation || []).map((p: any) => p.championship_id);

            const { data: predChamps } = await (supabase.from("predictions") as any)
                .select("matches(championship_id)")
                .eq("user_id", currentUser.id);

            const predictedIds = Array.from(new Set((predChamps || []).map((p: any) => p.matches?.championship_id).filter(Boolean)));
            const allUserChampIds = Array.from(new Set([...participatedIds, ...predictedIds]));

            const userHistoryChamps = allChamps.filter((c: any) => allUserChampIds.includes(c.id));
            const hasAnyHistory = userHistoryChamps.length > 0 || isAdmin;
            setHasHistory(hasAnyHistory);

            // 3. Handle default selection or URL params
            if (initialChampionshipId !== "all") {
                const current = allChamps.find((c: any) => c.id === initialChampionshipId);
                if (current) {
                    setCategoryFilter(current.category || "all");
                    setSelectedChampionship(initialChampionshipId);
                }
            } else if (hasAnyHistory) {
                // If history exists, default to the most recent participated championship
                // If admin, default to the most recent overall
                const defaultChamp = isAdmin ? allChamps[0] : userHistoryChamps[0];
                if (defaultChamp) {
                    setSelectedChampionship(defaultChamp.id);
                    setCategoryFilter(defaultChamp.category || "all");
                }
            } else {
                setSelectedChampionship("all");
            }
            setLoading(false);
        };
        fetchInitial();
    }, [currentUser, profile, isAdmin]);

    const categories = Array.from(new Set(championships.map((c: any) => c.category).filter(Boolean)));

    const fetchRankingAndSettings = async () => {
        if (!selectedChampionship || selectedChampionship === "all") {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch Ranking
            const { data: rankingData, error } = await (supabase
                .from("ranking_by_championship") as any)
                .select("*")
                .eq("championship_id", selectedChampionship);

            if (error) throw error;
            const { data: champ } = await supabase
                .from("championships")
                .select("settings")
                .eq("id", selectedChampionship)
                .single();

            const settings = (champ as any)?.settings || {};

            let sortedData = rankingData || [];
            const tiebreakers = settings.tiebreakerCriteria || ['pontos', 'buchas', 'situacoes', 'erros', 'highlander'];

            sortedData.sort((a: any, b: any) => {
                for (const criteria of tiebreakers) {
                    if (criteria === 'pontos') {
                        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                    } else if (criteria === 'buchas') {
                        if (b.exact_scores !== a.exact_scores) return (b.exact_scores || 0) - (a.exact_scores || 0);
                    } else if (criteria === 'situacoes') {
                        if (b.outcomes !== a.outcomes) return (b.outcomes || 0) - (a.outcomes || 0);
                    } else if (criteria === 'erros') {
                        if (b.errors !== a.errors) return (a.errors || 0) - (b.errors || 0); // Menos erros é melhor (crescente)
                    }
                }
                return 0;
            });

            setUsers(sortedData);

            setOfficialRanking(settings.officialRanking || []);
            setEnablePriority(settings.enableSelectionPriority ?? true);
            setEnableTiebreaker(settings.enableSelectionTiebreaker ?? false);

            // 3. Fetch Participants Selections (Try Relational Table first)
            const { data: parts, error: partsError } = await supabase
                .from("championship_participants")
                .select("user_id, team_selections")
                .eq("championship_id", selectedChampionship);

            const pMap = new Map<string, string[]>();

            if (parts && parts.length > 0) {
                parts.forEach((p: any) => {
                    pMap.set(p.user_id, p.team_selections || []);
                });
            } else {
                // FALLBACK: Legacy Participants in Settings (Euro 2012 style)
                const legacyParts = settings.participants || [];
                legacyParts.forEach((p: any) => {
                    // Handle various potential key names in legacy JSON
                    const uid = p.userId || p.id || p.user_id;
                    const selections = p.teamSelections || p.team_selections || p.selections || [];
                    if (uid) {
                        pMap.set(uid, selections);
                    }
                });
            }
            setParticipantsData(pMap);

        } catch (error) {
            console.error("Error fetching ranking:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRankingAndSettings();

        // Realtime Subscription
        const channel = supabase
            .channel('ranking-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'predictions'
            }, () => {
                fetchRankingAndSettings();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedChampionship]);

    const sortedUsers = [...users].sort((a, b) => {
        const valA = a[sortBy] || 0;
        const valB = b[sortBy] || 0;
        if (valA !== valB) return valB - valA;
        return b.total_points - a.total_points;
    });

    const getRankIcon = (index: number, total: number) => {
        if (index === 0) return <Crown className="h-6 w-6 text-yellow-500 animate-bounce" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
        if (index === total - 1 && total > 3) return <Siren className="h-6 w-6 text-red-600 animate-pulse" />;
        return null;
    };

    // --- Flag Logic Helpers (Highlander - Strict Priority) ---
    const getFlagElements = (userId: string) => {
        const teamSelections = participantsData.get(userId) || [];
        if (teamSelections.length === 0) return null;

        const isRankingReady = officialRanking.some(r => r && r !== "");

        const currentChamp = championships.find(c => c.id === selectedChampionship);
        const teamMode = currentChamp?.settings?.teamMode || 'clubes';

        if (!isRankingReady) {
            return teamSelections.map((team, idx) => {
                const iso = TEAM_ISO_MAP[team] || 'xx';
                return (
                    <Tooltip key={`${userId}-${idx}`}>
                        <TooltipTrigger asChild>
                            <div className="relative group/flag">
                                <img
                                    src={`https://flagcdn.com/w40/${iso}.png`}
                                    className={cn(
                                        "border border-white/10",
                                        teamMode === 'selecoes' ? "h-5 w-5 rounded-full object-cover" : "h-3 w-4.5 rounded-[2px] object-cover"
                                    )}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>{idx + 1}º {team}</TooltipContent>
                    </Tooltip>
                );
            });
        }

        // HIGHLANDER CALCULATION (Local Scope)
        // Determines specifically who has the absolute highest priority hit according to the rules
        let winningTeam: string | null = null;
        let winningPriorityIdx = 999;
        let winnersSet = new Set<string>();
        let matchedAdminTeams = new Set<string>();

        if (enablePriority) {
            let currentCandidates = Array.from(participantsData.entries()).map(([uid, selections]) => ({
                userId: uid,
                teamSelections: selections || []
            }));

            // To support recursive tie-breakers
            for (let i = 0; i < officialRanking.length; i++) {
                const adminTeam = officialRanking[i];
                if (!adminTeam) continue;

                // Who of the current candidates selected this team?
                const usersWithTeam = currentCandidates.filter(u => u.teamSelections.includes(adminTeam));

                if (usersWithTeam.length > 0) {
                    matchedAdminTeams.add(adminTeam);
                    // Record the exact top overall team for visual styling if it's the 1st match
                    if (!winningTeam) winningTeam = adminTeam;

                    let bestPriority = 999;
                    usersWithTeam.forEach(u => {
                        const idx = u.teamSelections.indexOf(adminTeam);
                        if (idx !== -1 && idx < bestPriority) bestPriority = idx;
                    });
                    
                    if (winningPriorityIdx === 999) winningPriorityIdx = bestPriority;

                    // Filter candidates down to those who got this best priority
                    const tiedCandidates = usersWithTeam.filter(u => u.teamSelections.indexOf(adminTeam) === bestPriority);

                    if (!enableTiebreaker) {
                        // Standard rule: just add them all and stop
                        tiedCandidates.forEach(u => winnersSet.add(u.userId));
                        break;
                    } else {
                        // Advanced rule: if only 1, they win. If > 1, shrink pool and continue loop
                        if (tiedCandidates.length === 1) {
                            winnersSet.add(tiedCandidates[0].userId);
                            break;
                        } else {
                            currentCandidates = tiedCandidates;
                            // continue loop to next adminTeam to break the tie
                        }
                    }
                }
            }

            // Fallback if loop ended but tiedCandidates were stuck
            if (enableTiebreaker && winnersSet.size === 0 && currentCandidates.length > 0) {
                 currentCandidates.forEach(u => winnersSet.add(u.userId));
            }
        }

        return teamSelections.map((team, idx) => {
            const iso = TEAM_ISO_MAP[team] || 'xx';
            const teamRank = officialRanking.indexOf(team);
            const isHit = teamRank !== -1;

            const isAbsoluteWinner = enablePriority
                ? (winnersSet.has(userId) && matchedAdminTeams.has(team))
                : isHit;

            // Visual Logic:
            // Absolute Winner: Full Opacity
            // Hit (Legacy/NoPriority): Full Opacity
            // Others: Dimmed (Opacity 30%), Grayscale
            return (
                <Tooltip key={`${userId}-${idx}`}>
                    <TooltipTrigger asChild>
                        <div className={`relative group/flag transition-all duration-300
                            ${isAbsoluteWinner ? "opacity-100" : "opacity-30 grayscale"}
                             ${!enablePriority && isHit ? "opacity-100 grayscale-0" : ""}
                        `}>
                            <img
                                src={`https://flagcdn.com/w40/${iso}.png`}
                                alt={team}
                                className={cn(
                                    "shadow-sm cursor-help transition-all",
                                    teamMode === 'selecoes' ? "h-5 w-5 rounded-full object-cover" : "h-3 w-4.5 rounded-[2px] object-cover"
                                )}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className={`text-[10px] font-bold px-2 py-1 ${!isAbsoluteWinner && enablePriority ? "opacity-70" : ""}`}>
                        {idx + 1}º {team}
                        {isAbsoluteWinner && (enablePriority ? " (LÍDER ABSOLUTO! 🏆)" : " (Acertou! ✅)")}
                    </TooltipContent>
                </Tooltip>
            );
        });
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Ranking</h1>
                    {(hasHistory || isAdmin) && (
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <Select
                                value={categoryFilter}
                                onValueChange={(val) => {
                                    setCategoryFilter(val);
                                    if (val !== "all") {
                                        const inCat = championships.filter(c => c.category === val);
                                        if (inCat.length > 0) setSelectedChampionship(inCat[0].id);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Agrupamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Agrupamentos</SelectItem>
                                    {categories.map((cat: any) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                                <SelectTrigger className="w-full sm:w-[260px]">
                                    <SelectValue placeholder="Selecione um Campeonato" />
                                </SelectTrigger>
                                <SelectContent>
                                    {championships
                                        .filter(c => categoryFilter === "all" || c.category === categoryFilter)
                                        .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <Card>
                    {!loading && (hasHistory || isAdmin) && (
                        <CardHeader className="border-b bg-muted/5 p-0">
                            <div className="flex items-center text-xs font-bold text-muted-foreground px-4 py-3 gap-2 uppercase tracking-wider">
                                <div className="w-8 text-center">Pos.</div>
                                <div className="flex-1">Jogador</div>

                                {/* Desktop Headers */}
                                <div className="hidden sm:flex items-center gap-0">
                                    <HeaderItem label="Pontos" active={sortBy === 'total_points'} onClick={() => setSortBy('total_points')} />
                                    <HeaderItem label="Buchas" active={sortBy === 'exact_scores'} onClick={() => setSortBy('exact_scores')} />
                                    <HeaderItem label="Situação" active={sortBy === 'outcomes'} onClick={() => setSortBy('outcomes')} />
                                </div>

                                {/* Mobile Header with Switcher */}
                                <div className="flex sm:hidden items-center justify-end">
                                    <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                                        <SelectTrigger className="h-7 border-0 bg-transparent focus:ring-0 p-0 text-[10px] font-bold uppercase w-20 justify-end gap-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="total_points">Pontos</SelectItem>
                                            <SelectItem value="exact_scores">Buchas</SelectItem>
                                            <SelectItem value="outcomes">Situação</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                    )}
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                <p className="text-xs text-muted-foreground font-medium">Carregando dados...</p>
                            </div>
                        ) : hasHistory === false && !isAdmin ? (
                            <div className="p-20 text-center bg-card/30 border border-dashed rounded-2xl m-4 animate-in fade-in zoom-in duration-500">
                                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <h3 className="text-xl font-bold text-foreground">Ranking não disponível</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed">
                                    Você ainda não participa de nenhum campeonato ativo ou finalizado para visualizar o ranking.
                                </p>
                            </div>
                        ) : sortedUsers.length === 0 ? (
                            <div className="p-20 text-center bg-card/30 border border-dashed rounded-2xl m-4">
                                <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="text-muted-foreground">Ninguém pontuou ainda neste campeonato.</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {sortedUsers.map((user, index) => (
                                    <div key={user.user_id} className={`flex items-center px-4 py-3 gap-2 hover:bg-muted/30 transition-colors ${currentUser?.id === user.user_id ? "bg-primary/5 border-l-4 border-primary" : ""}`}>
                                        <div className="w-8 text-center font-bold text-muted-foreground">{index + 1}</div>
                                        <div className="flex-1 flex items-center gap-3 min-w-0">
                                            <Avatar className="h-10 w-10 border shrink-0">
                                                <AvatarImage src={user.foto_perfil} />
                                                <AvatarFallback>{(user.nickname || user.nome || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="truncate flex flex-col justify-center">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/dashboard/profile/${user.user_id}`} className="hover:underline font-bold text-sm">
                                                        {user.nickname || user.nome}
                                                    </Link>
                                                    {getRankIcon(index, sortedUsers.length)}
                                                </div>

                                                {/* FLAGS AREA */}
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {/* DESKTOP: Flags inline */}
                                                    <div className="hidden md:flex items-center gap-1">
                                                        {getFlagElements(user.user_id)}
                                                    </div>

                                                    {/* MOBILE: Trophy with Tooltip */}
                                                    <div className="md:hidden">
                                                        {participantsData.get(user.user_id) && participantsData.get(user.user_id)!.length > 0 && (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                                                        <Trophy className="h-3.5 w-3.5 text-yellow-500/80" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
                                                                    <div className="flex gap-1.5">
                                                                        {getFlagElements(user.user_id)}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Desktop Stats */}
                                        <div className="hidden sm:flex items-center">
                                            <StatValue value={user.total_points} active={sortBy === 'total_points'} />
                                            <StatValue value={user.exact_scores} active={sortBy === 'exact_scores'} />
                                            <StatValue value={user.outcomes} active={sortBy === 'outcomes'} />
                                        </div>

                                        {/* Mobile Stat (Only active) */}
                                        <div className="sm:hidden flex items-center justify-end w-20">
                                            <StatValue
                                                value={sortBy === 'total_points' ? user.total_points : sortBy === 'exact_scores' ? user.exact_scores : user.outcomes}
                                                active={true}
                                                mobile={true}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}

function HeaderItem({ label, active, onClick }: any) {
    return (
        <div onClick={onClick} className={`w-16 text-center cursor-pointer hover:text-primary transition-colors text-xs uppercase font-bold ${active ? "text-primary border-b-2 border-primary" : ""}`}>
            {label}
        </div>
    );
}

function StatValue({ value, active, mobile }: any) {
    return (
        <div className={`${mobile ? "w-full" : "w-16"} text-center font-mono text-sm ${active ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}>
            {value}
        </div>
    );
}
