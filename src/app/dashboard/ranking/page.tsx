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
    const { user: currentUser } = useAuth();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const initialChampionshipId = searchParams.get("championship") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<any[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [selectedChampionship, setSelectedChampionship] = useState<string>(initialChampionshipId);
    const [sortBy, setSortBy] = useState<'total_points' | 'exact_scores' | 'outcomes'>('total_points');

    // Features for Flags
    const [officialRanking, setOfficialRanking] = useState<string[]>([]);
    const [enablePriority, setEnablePriority] = useState<boolean>(true);
    const [participantsData, setParticipantsData] = useState<Map<string, string[]>>(new Map());

    useEffect(() => {
        const fetchInitial = async () => {
            const { data: champs } = await (supabase.from("championships") as any)
                .select("*")
                .order("created_at", { ascending: false });

            setChampionships(champs || []);

            if (initialChampionshipId === "all" && champs && (champs as any[]).length > 0) {
                const newest = (champs as any[])[0];
                setSelectedChampionship(newest.id);
                setCategoryFilter(newest.category || "all");
            } else if (initialChampionshipId !== "all" && champs) {
                const current = (champs as any[]).find(c => c.id === initialChampionshipId);
                if (current) setCategoryFilter(current.category || "all");
            }
        };
        fetchInitial();
    }, []);

    const categories = Array.from(new Set(championships.map((c: any) => c.category).filter(Boolean)));

    const fetchRankingAndSettings = async () => {
        if (!selectedChampionship || selectedChampionship === "all") return;
        setLoading(true);
        try {
            // 1. Fetch Ranking
            const { data: rankingData, error } = await (supabase
                .from("ranking_by_championship") as any)
                .select("*")
                .eq("championship_id", selectedChampionship);

            if (error) throw error;
            setUsers(rankingData || []);

            // 2. Fetch Championship Settings (for Rules)
            const { data: champ } = await supabase
                .from("championships")
                .select("settings")
                .eq("id", selectedChampionship)
                .single();

            const settings = (champ as any)?.settings || {};
            setOfficialRanking(settings.officialRanking || []);
            setEnablePriority(settings.enableSelectionPriority ?? true);

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

        if (enablePriority) {
            // Convert Map to Array for filtering
            const allParticipantsList = Array.from(participantsData.entries()).map(([uid, selections]) => ({
                userId: uid,
                teamSelections: selections || []
            }));

            // 1. Iterate Official Ranking (1st -> 2nd -> ...)
            for (const adminTeam of officialRanking) {
                if (!adminTeam) continue;

                // Which users selected this team (in ANY slot)?
                const usersWithTeam = allParticipantsList.filter(u => u.teamSelections.includes(adminTeam));

                if (usersWithTeam.length > 0) {
                    // FOUND THE TOP TEAM THAT HAS BETS.
                    winningTeam = adminTeam;

                    // 2. Find the BEST priority used for this team (Lowest Index = Best)
                    let bestPriority = 999;
                    usersWithTeam.forEach(u => {
                        const idx = u.teamSelections.indexOf(adminTeam);
                        if (idx !== -1 && idx < bestPriority) bestPriority = idx;
                    });
                    winningPriorityIdx = bestPriority;

                    // 3. Mark only those users who attained this best priority as winners
                    usersWithTeam.forEach(u => {
                        if (u.teamSelections.indexOf(adminTeam) === bestPriority) {
                            winnersSet.add(u.userId);
                        }
                    });

                    // STOP. We found the "Highlander" level. No need to check 2nd place or lower priorities.
                    break;
                }
            }
        }

        return teamSelections.map((team, idx) => {
            const iso = TEAM_ISO_MAP[team] || 'xx';
            const teamRank = officialRanking.indexOf(team);
            const isHit = teamRank !== -1;

            const isAbsoluteWinner = enablePriority
                ? (winnersSet.has(userId) && team === winningTeam && idx === winningPriorityIdx)
                : isHit;

            // Visual Logic:
            // Absolute Winner: Full Opacity, Bounce, Golden Border, Glow
            // Hit (Legacy/NoPriority): Green Border, Glow
            // Others (if Priority is On): Dimmed, Grayscale
            return (
                <Tooltip key={`${userId}-${idx}`}>
                    <TooltipTrigger asChild>
                        <div className={`relative group/flag transition-all duration-500
                            ${isAbsoluteWinner ? "opacity-100 scale-125 z-10 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" : "opacity-30 grayscale blur-[0.5px] scale-90"}
                             ${!enablePriority && isHit ? "opacity-100 grayscale-0 blur-0 scale-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] border-emerald-500/50" : ""}
                        `}>
                            <img
                                src={`https://flagcdn.com/w40/${iso}.png`}
                                alt={team}
                                className={cn(
                                    "shadow-sm cursor-help border transition-all",
                                    teamMode === 'selecoes' ? "h-5 w-5 rounded-full object-cover" : "h-3 w-4.5 rounded-[2px] object-cover",
                                    isAbsoluteWinner && enablePriority ? `border-yellow-400 border-2` : (!enablePriority && isHit ? `border-emerald-400 border-2` : 'border-white/5')
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
                </div>

                <Card>
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
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                        ) : sortedUsers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">Ninguém pontuou ainda.</div>
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
