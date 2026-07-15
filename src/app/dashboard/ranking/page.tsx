"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase";
import { Crown, Medal, Trophy, Siren, Loader2, Info, ExternalLink, Star, Gem, Ghost } from "lucide-react";
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
    'Brasil': 'br', 'Argentina': 'ar', 'Uruguai': 'uy', 'Bélgica': 'be', 'Belgica': 'be',
    'Suíça': 'ch', 'México': 'mx', 'Colômbia': 'co', 'Japão': 'jp',
    'Senegal': 'sn', 'Marrocos': 'ma', 'Irã': 'ir', 'Egito': 'eg',
    'Arábia Saudita': 'sa', 'Austrália': 'au', 'Islândia': 'is', 'Peru': 'pe',
    'Nigéria': 'ng', 'Costa Rica': 'cr', 'Sérvia': 'rs', 'Coréia do Sul': 'kr',
    'Panamá': 'pa', 'Tunísia': 'tn', 'Turquia': 'tr', 'Áustria': 'at',
    'Chile': 'cl', 'Paraguai': 'py'
};

const CATEGORY_MAP: Record<string, string> = {
    "world_cup": "Copa do Mundo",
    "euro": "Eurocopa",
    "copa_america": "Copa América",
    "brasileirao": "Brasileirão",
    "libertadores": "Libertadores",
    "champions_league": "Champions League",
    "nacional": "Nacional",
    "other": "Outros"
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
    const [isSwitching, setIsSwitching] = useState(false);
    const [championships, setChampionships] = useState<any[]>([]);
    const [allChampionships, setAllChampionships] = useState<any[]>([]);
    const [hasHistory, setHasHistory] = useState<boolean | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [selectedChampionship, setSelectedChampionship] = useState<string>(initialChampionshipId);
    const [sortBy, setSortBy] = useState<'total_points' | 'exact_scores' | 'outcomes'>('total_points');

    const [officialRanking, setOfficialRanking] = useState<string[]>([]);
    const [enablePriority, setEnablePriority] = useState<boolean>(true);
    const [enableTiebreaker, setEnableTiebreaker] = useState<boolean>(false);
    const [manualGoldWinners, setManualGoldWinners] = useState<string[]>([]);
    const [participantsData, setParticipantsData] = useState<Map<string, string[]>>(new Map());
    const [legacyUrl, setLegacyUrl] = useState<string>("");
    const [teamDict, setTeamDict] = useState<Map<string, string>>(new Map());
    const [hasChampStarted, setHasChampStarted] = useState<boolean>(false);

    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    useEffect(() => {
        const fetchInitial = async () => {
            if (!currentUser) return;

            // 1. Fetch ALL championships
            const { data: champs } = await (supabase.from("championships") as any)
                .select("*");

            let allChamps = (champs || []).filter((c: any) => c.status !== 'agendado');

            // Sort logic: Ativo championships first, then by start date descending (newest first)
            allChamps.sort((a: any, b: any) => {
                const aActive = a.status === 'ativo';
                const bActive = b.status === 'ativo';
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                
                const dateA = a.settings?.startDate ? new Date(a.settings.startDate).getTime() : new Date(a.created_at).getTime();
                const dateB = b.settings?.startDate ? new Date(b.settings.startDate).getTime() : new Date(b.created_at).getTime();
                return dateB - dateA;
            });

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

            const targetChampionships = isAdmin ? allChamps : userHistoryChamps;
            setChampionships(targetChampionships);
            setAllChampionships(allChamps);

            // 3. Handle default selection or URL params
            if (initialChampionshipId !== "all") {
                const current = targetChampionships.find((c: any) => c.id === initialChampionshipId);
                if (current) {
                    setCategoryFilter(current.category || "other");
                    setSelectedChampionship(initialChampionshipId);
                }
            } else if (targetChampionships.length > 0) {
                // Default to the most recent participated (or overall if admin)
                const defaultChamp = targetChampionships[0];
                setSelectedChampionship(defaultChamp.id);
                setCategoryFilter(defaultChamp.category || "other");
            } else {
                setSelectedChampionship("");
                setCategoryFilter("");
            }
            
            // Fetch teams dictionary for shields
            const { data: teamsData } = await supabase.from('teams').select('name, shield_url').not('shield_url', 'is', null);
            const tDict = new Map<string, string>();
            if (teamsData) {
                teamsData.forEach((t: any) => tDict.set(t.name, t.shield_url));
            }
            setTeamDict(tDict);
            
            setLoading(false);
        };
        fetchInitial();
    }, [currentUser, profile, isAdmin]);

    const categories = Array.from(new Set(championships.map((c: any) => c.category || "other")));

    const fetchRankingAndSettings = async () => {
        if (!selectedChampionship || selectedChampionship === "all") {
            setLoading(false);
            setIsSwitching(false);
            return;
        }
        setIsSwitching(true);
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

            // 2. Filter out the specific ghost player for this championship
            const ghostUserId = settings.ghostPlayer || null;
            let rawData = (rankingData || []).filter((r: any) => r.user_id !== ghostUserId);
            
            // 3. Fetch Participants Selections (Try Relational Table first)
            const { data: parts, error: partsError } = await supabase
                .from("championship_participants")
                .select("user_id, team_selections")
                .eq("championship_id", selectedChampionship);

            const pMap = new Map<string, string[]>();

            if (parts && parts.length > 0) {
                // Fetch public profiles to get missing users' names
                const res = await fetch('/api/users/public');
                const { data: publicProfiles } = await res.json();
                const profilesMap = new Map((publicProfiles || []).map((p: any) => [p.id, p]));
                
                const existingUserIds = new Set(rawData.map((r: any) => r.user_id));

                parts.forEach((p: any) => {
                    pMap.set(p.user_id, p.team_selections || []);
                    
                    if (ghostUserId && p.user_id === ghostUserId) return;

                    // Add participant to ranking with 0 points if they are missing
                    if (!existingUserIds.has(p.user_id)) {
                        const prof = profilesMap.get(p.user_id) as any;
                        if (prof) {
                            rawData.push({
                                user_id: p.user_id,
                                nome: prof.nome,
                                nickname: prof.nickname,
                                foto_perfil: prof.foto_perfil,
                                total_points: 0,
                                exact_scores: 0,
                                outcomes: 0,
                                errors: 0
                            });
                            existingUserIds.add(p.user_id);
                        }
                    }
                });
            } else {
                // FALLBACK: Legacy Participants in Settings (Euro 2012 style) or Manually added by Admin
                const legacyParts = settings.participants || [];
                
                const res = await fetch('/api/users/public');
                const { data: publicProfiles } = await res.json();
                const profilesMap = new Map((publicProfiles || []).map((p: any) => [p.id, p]));
                
                const existingUserIds = new Set(rawData.map((r: any) => r.user_id));

                legacyParts.forEach((p: any) => {
                    const uid = p.userId || p.id || p.user_id;
                    const selections = p.teamSelections || p.team_selections || p.selections || [];
                    if (uid) {
                        pMap.set(uid, selections);
                        
                        if (ghostUserId && uid === ghostUserId) return;

                        // Add participant to ranking with 0 points if they are missing
                        if (!existingUserIds.has(uid)) {
                            // First try to get from legacy data, then from public profiles
                            const prof = profilesMap.get(uid) as any;
                            const legacyName = p.displayName || p.name || p.nome;
                            
                            if (prof || legacyName) {
                                rawData.push({
                                    user_id: uid,
                                    nome: prof?.nome || legacyName || "Usuário",
                                    nickname: prof?.nickname || "",
                                    foto_perfil: prof?.foto_perfil || p.photoUrl || p.foto_perfil || "",
                                    total_points: 0,
                                    exact_scores: 0,
                                    outcomes: 0,
                                    errors: 0
                                });
                                existingUserIds.add(uid);
                            }
                        }
                    }
                });
            }
            
            // Explicitly Inject Loia if enabled and missing
            if (settings.enableLoia) {
                const legacyParts = settings.participants || [];
                const loiaParticipant = legacyParts.find((p: any) => p.email === "lindoaldo@legacy.local");
                const loiaId = loiaParticipant?.userId || loiaParticipant?.id || loiaParticipant?.user_id;
                
                if (loiaId) {
                    const selections = loiaParticipant.selections || loiaParticipant.teamSelections || [];
                    pMap.set(loiaId, selections);
                    
                    if (!rawData.some((r: any) => r.user_id === loiaId)) {
                        rawData.push({
                            user_id: loiaId,
                            nome: loiaParticipant.displayName || loiaParticipant.name || "Lindoaldo",
                            nickname: "Lóia",
                            foto_perfil: loiaParticipant.photoUrl || "",
                            total_points: 0,
                            exact_scores: 0,
                            outcomes: 0,
                            errors: 0
                        });
                    }
                }
            }
            
            setParticipantsData(pMap);

            // Compute real points for injected users (those missing from the SQL view)
            const injectedUserIds = rawData.filter((r: any) => !rankingData?.some((o: any) => o.user_id === r.user_id)).map((r: any) => r.user_id);
            
            if (injectedUserIds.length > 0) {
                const { data: missingPreds } = await supabase
                    .from("predictions")
                    .select("user_id, points, home_score, away_score, is_combo, combo_total_goals, matches!inner(championship_id, score_home, score_away)")
                    .eq("matches.championship_id", selectedChampionship)
                    .in("user_id", injectedUserIds);
                    
                if (missingPreds && missingPreds.length > 0) {
                    rawData.forEach((user: any) => {
                        if (injectedUserIds.includes(user.user_id)) {
                            const userPreds = missingPreds.filter((p: any) => p.user_id === user.user_id);
                            
                            let pontos = 0;
                            let buchas = 0;
                            let situacao = 0;
                            let erros = 0;

                            userPreds.forEach((p: any) => {
                                pontos += (p.points || 0);

                                const match = p.matches;
                                if (match && match.score_home !== null && match.score_away !== null) {
                                    const ph = p.home_score;
                                    const pa = p.away_score;
                                    const mh = match.score_home;
                                    const ma = match.score_away;

                                    const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
                                    const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);

                                    const isExact = ph === mh && pa === ma;
                                    const hitGoals = p.is_combo && p.combo_total_goals === (mh + ma);

                                    if (isExact) {
                                        buchas++;
                                    } else {
                                        if (winP === winM) situacao++;
                                        if (winP !== winM && !hitGoals) erros++;
                                    }
                                }
                            });
                            
                            user.total_points = pontos;
                            user.exact_scores = buchas;
                            user.outcomes = situacao;
                            user.errors = erros;
                        }
                    });
                }
            }
            const exactPoints = settings.exactScorePoints || 3;
            const { data: allBuchas } = await supabase
                .from("predictions")
                .select("user_id, matches!inner(date)")
                .eq("matches.championship_id", selectedChampionship)
                .gte("points", exactPoints);
                
            const firstBuchaMap = new Map();
            if (allBuchas) {
                allBuchas.forEach((b: any) => {
                    const time = new Date(b.matches.date).getTime();
                    const current = firstBuchaMap.get(b.user_id) || Infinity;
                    if (time < current) firstBuchaMap.set(b.user_id, time);
                });
            }

            const tiebreakers = settings.tiebreakerCriteria || ['pontos', 'buchas', 'situacoes', 'erros', 'highlander'];

            rawData.sort((a: any, b: any) => {
                for (const criteria of tiebreakers) {
                    if (criteria === 'pontos') {
                        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                    } else if (criteria === 'buchas') {
                        if (b.exact_scores !== a.exact_scores) return (b.exact_scores || 0) - (a.exact_scores || 0);
                    } else if (criteria === 'situacoes') {
                        if (b.outcomes !== a.outcomes) return (b.outcomes || 0) - (a.outcomes || 0);
                    } else if (criteria === 'erros') {
                        if (b.errors !== a.errors) return (a.errors || 0) - (b.errors || 0); // Menos erros é melhor (crescente)
                    } else if (criteria === 'primeira_bucha') {
                        const timeA = firstBuchaMap.get(a.user_id) || Infinity;
                        const timeB = firstBuchaMap.get(b.user_id) || Infinity;
                        if (timeA !== timeB) return timeA - timeB; // Data mais antiga vence
                    }
                }
                const nameA = a.nickname || a.nome || "";
                const nameB = b.nickname || b.nome || "";
                return nameA.localeCompare(nameB);
            });

            // HOTFIX: Copa do Mundo 2026 - Recalculate accurately to ignore 'scheduled' matches
            if (selectedChampionship === '87b22aab-521b-4302-815a-500bec4b4a0a') {
                const { count: matchesCount } = await supabase
                    .from("matches")
                    .select("id", { count: "exact" })
                    .eq("championship_id", selectedChampionship)
                    .in("status", ["live", "finished"]);
                    
                const totalLiveFinishedMatches = matchesCount || 0;

                let allPreds: any[] = [];
                let page = 0;
                while (true) {
                    const { data: p } = await supabase
                        .from("predictions")
                        .select("user_id, points, home_score, away_score, is_combo, combo_total_goals, matches!inner(championship_id, status, score_home, score_away)")
                        .eq("matches.championship_id", selectedChampionship)
                        .range(page * 1000, (page + 1) * 1000 - 1);
                    
                    if (!p || p.length === 0) break;
                    allPreds = allPreds.concat(p);
                    page++;
                }
                
                if (allPreds) {
                    rawData.forEach((user: any) => {
                        const userPreds = allPreds.filter((p: any) => p.user_id === user.user_id);
                        
                        let pontos = 0;
                        let buchas = 0;
                        let situacao = 0;
                        let erros = 0;

                        userPreds.forEach((p: any) => {
                            const match = p.matches;
                            if (match && (match.status === 'live' || match.status === 'finished')) {
                                pontos += (p.points || 0);

                                const ph = p.home_score;
                                const pa = p.away_score;
                                const mh = match.score_home;
                                const ma = match.score_away;

                                const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
                                const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);

                                const isExact = ph === mh && pa === ma;

                                if (isExact) {
                                    buchas++;
                                } else {
                                    if (winP === winM) situacao++;
                                }
                            }
                        });
                        
                        // Strict error calculation: Any match that is live/finished and not a bucha or situacao is an error (including missing predictions)
                        erros = totalLiveFinishedMatches - buchas - situacao;
                        if (erros < 0) erros = 0; // fallback just in case
                        
                        user.total_points = pontos;
                        user.exact_scores = buchas;
                        user.outcomes = situacao;
                        user.errors = erros;
                    });
                    
                    // Re-sort after hotfix recalculation
                    rawData.sort((a: any, b: any) => {
                        for (const criteria of tiebreakers) {
                            if (criteria === 'pontos') {
                                if (b.total_points !== a.total_points) return b.total_points - a.total_points;
                            } else if (criteria === 'buchas') {
                                if (b.exact_scores !== a.exact_scores) return (b.exact_scores || 0) - (a.exact_scores || 0);
                            } else if (criteria === 'situacoes') {
                                if (b.outcomes !== a.outcomes) return (b.outcomes || 0) - (a.outcomes || 0);
                            } else if (criteria === 'erros') {
                                if (b.errors !== a.errors) return (a.errors || 0) - (b.errors || 0); 
                            } else if (criteria === 'primeira_bucha') {
                                const timeA = firstBuchaMap.get(a.user_id) || Infinity;
                                const timeB = firstBuchaMap.get(b.user_id) || Infinity;
                                if (timeA !== timeB) return timeA - timeB; // Data mais antiga vence
                            }
                        }
                        const nameA = a.nickname || a.nome || "";
                        const nameB = b.nickname || b.nome || "";
                        return nameA.localeCompare(nameB);
                    });
                }
            }

            setUsers(rawData);

            setOfficialRanking(settings.officialRanking || []);
            setEnablePriority(settings.enableSelectionPriority ?? true);
            setEnableTiebreaker(settings.enableSelectionTiebreaker ?? true);
            
            const manualWinners = settings.manualWinners || [];
            const goldIds = manualWinners.filter((w: any) => w.position === 'gold_winner').map((w: any) => w.userId);
            setManualGoldWinners(goldIds);
            
            setLegacyUrl(settings.legacySpreadsheetUrl || "");

            // 5. Check if championship has started (First match date is in the past)
            const { data: firstMatch } = await supabase
                .from("matches")
                .select("date, status")
                .eq("championship_id", selectedChampionship)
                .order("date", { ascending: true })
                .limit(1)
                .maybeSingle();
                
            let started = false;
            if (firstMatch) {
                const fm = firstMatch as any;
                started = fm.status === 'live' || fm.status === 'finished' || new Date(fm.date).getTime() < new Date().getTime();
            }
            // For legacy migrated tournaments, they are already finished so it will be true
            setHasChampStarted(started);

        } catch (error) {
            console.error("Failed to fetch ranking:", error);
        } finally {
            setLoading(false);
            setIsSwitching(false);
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
        if (index === 0) return <Crown className="h-6 w-6 text-yellow-500" />;
        if (index === total - 1 && total > 3) return <Siren className="h-6 w-6 text-red-600 animate-pulse" />;
        return null;
    };

    const getUserTitles = (userId: string) => {
        return allChampionships.filter((c: any) => {
            const settings = c.settings || {};
            const winners = settings.winners || settings.manualWinners || [];
            return winners.some((w: any) =>
                (w.user_id === userId || w.userId === userId) &&
                w.position === 'champion'
            );
        }).length;
    };

    const renderMiniPrestigeBadges = (titles: number) => {
        if (titles <= 0) return null;
        
        let iconType = 'star';
        let count = titles;
        
        if (titles >= 7) {
            iconType = 'diamond';
            count = titles - 6; 
            if (count > 3) count = 3;
        } else if (titles >= 4) {
            iconType = 'trophy';
            count = titles - 3;
        }

        const icons = [];
        for (let i = 0; i < count; i++) {
            if (iconType === 'diamond') {
                icons.push(<Gem key={i} className="h-2 w-2 text-cyan-400 drop-shadow-[0_0_2px_rgba(34,211,238,0.8)]" />);
            } else if (iconType === 'trophy') {
                icons.push(<Trophy key={i} className="h-2 w-2 text-amber-500 fill-amber-500/20 drop-shadow-[0_0_2px_rgba(245,158,11,0.8)]" />);
            } else {
                icons.push(<Star key={i} className="h-2 w-2 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]" />);
            }
        }

        const content = (
            <div role="button" tabIndex={0} className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-[1px] bg-slate-950 border border-slate-800 rounded-full px-[5px] py-[2px] shadow-xl z-20 cursor-pointer focus:outline-none">
                {icons}
            </div>
        );

        return (
            <Popover>
                <PopoverTrigger asChild>
                    {content}
                </PopoverTrigger>
                <PopoverContent side="bottom" className="w-auto max-w-[200px] text-[10px] p-2 bg-slate-950 dark:bg-slate-950 border-slate-700 text-white shadow-xl z-50">
                    <p className="font-bold mb-0.5">Sistema de Prestígio 🏆</p>
                    <p className="text-slate-300">Venceu {titles} campeonato(s).</p>
                </PopoverContent>
            </Popover>
        );
    };

    // --- Flag Logic Helpers (Highlander - Strict Priority) ---
    const getFlagElements = (userId: string) => {
        const teamSelections = participantsData.get(userId) || [];
        if (teamSelections.length === 0) return null;

        const isRankingReady = officialRanking.some(r => r && r !== "");

        const currentChamp = championships.find(c => c.id === selectedChampionship);
        const teamMode = currentChamp?.settings?.teamMode || 'clubes';

        const isLoia = users.find(u => u.user_id === userId)?.nickname === "Lóia";
        
        // BUSINESS RULE: Do not show selections of other users before the first match starts!
        if (!hasChampStarted && userId !== currentUser?.id && !isAdmin && !isLoia) {
             return (
                 <Tooltip>
                     <TooltipTrigger asChild>
                         <div className={cn(
                             "flex items-center justify-center border border-dashed border-slate-400 bg-slate-200 dark:bg-slate-800 text-slate-500",
                             teamMode === 'selecoes' ? "h-5 w-5 rounded-full" : "h-4 w-4 rounded-full"
                         )}>
                             <span className="text-[10px] font-bold">?</span>
                         </div>
                     </TooltipTrigger>
                     <TooltipContent>Seleções ocultas até o início do campeonato</TooltipContent>
                 </Tooltip>
             );
        }

        if (!isRankingReady) {
            return teamSelections.map((team, idx) => {
                const iso = TEAM_ISO_MAP[team] || 'xx';
                const shieldUrl = teamDict.get(team) || `https://flagcdn.com/w40/${iso}.png`;
                return (
                    <Tooltip key={`${userId}-${idx}`}>
                        <TooltipTrigger asChild>
                            <div className="relative group/flag">
                                <img
                                    src={shieldUrl}
                                    className={cn(
                                        "border border-white/10",
                                        teamMode === 'selecoes' ? "h-5 w-5 rounded-full object-cover" : "h-4 w-4 rounded-full object-contain bg-white"
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

        if (manualGoldWinners.length > 0) {
            // Bypass the local calculation if the admin manually set the winners
            manualGoldWinners.forEach(id => winnersSet.add(id));
            
            // Determine the "winning team" to light up based on what the manual winners actually picked
            for (const adminTeam of officialRanking) {
                if (!adminTeam) continue;
                // If any of the manual winners picked this team, it is the highest ranked team they hit
                const pickedByWinner = manualGoldWinners.some(uid => {
                    const sel = participantsData.get(uid);
                    return sel && sel.includes(adminTeam);
                });
                
                if (pickedByWinner) {
                    winningTeam = adminTeam;
                    break;
                }
            }
        } else if (enablePriority) {
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
            const shieldUrl = teamDict.get(team) || `https://flagcdn.com/w40/${iso}.png`;
            const teamRank = officialRanking.indexOf(team);
            const isHit = teamRank !== -1;

            // Visual Logic:
            // Absolute Winner: Full Opacity
            // Hit (Legacy/NoPriority): Full Opacity
            // Others: Dimmed (Opacity 30%), Grayscale
            const enforceAbsoluteLogic = manualGoldWinners.length > 0 || enablePriority;
            const isAbsoluteWinner = enforceAbsoluteLogic
                ? (winnersSet.has(userId) && team === winningTeam)
                : isHit;

            return (
                <Tooltip key={`${userId}-${idx}`}>
                    <TooltipTrigger asChild>
                        <div className={`relative group/flag  
                            ${isAbsoluteWinner ? "opacity-100" : "opacity-30 grayscale"}
                             ${!enforceAbsoluteLogic && isHit ? "opacity-100 grayscale-0" : ""}
                        `}>
                            <img
                                src={shieldUrl}
                                alt={team}
                                className={cn(
                                    "shadow-sm cursor-help ",
                                    teamMode === 'selecoes' ? "h-5 w-5 rounded-full object-cover" : "h-5 w-5 rounded-full object-contain bg-white border border-slate-200 dark:border-slate-800"
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
                    {(hasHistory || isAdmin) && championships.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <Select
                                value={categoryFilter}
                                onValueChange={(val) => {
                                    setCategoryFilter(val);
                                    // Auto-select the newest championship in this category
                                    const inCat = championships.filter(c => (c.category || "other") === val);
                                    if (inCat.length > 0) setSelectedChampionship(inCat[0].id);
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Agrupamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat: any) => (
                                        <SelectItem key={cat} value={cat}>{CATEGORY_MAP[cat] || cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                                <SelectTrigger className="w-full sm:w-[260px]">
                                    <SelectValue placeholder="Selecione um Campeonato" />
                                </SelectTrigger>
                                <SelectContent>
                                    {championships
                                        .filter(c => (c.category || "other") === categoryFilter)
                                        .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <Card className={`bg-card ${isSwitching ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-200`}>
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
                                    <div key={user.user_id} className="flex items-center px-4 py-3 gap-2 hover:bg-muted/30 transition-colors">
                                        <div className="w-8 text-center font-bold text-muted-foreground">{index + 1}</div>
                                        <div className="flex-1 flex items-center gap-3 min-w-0">
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 border shrink-0">
                                                    <AvatarImage src={user.foto_perfil} />
                                                    <AvatarFallback>{(user.nickname || user.nome || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                {renderMiniPrestigeBadges(getUserTitles(user.user_id))}
                                            </div>
                                            <div className="truncate flex flex-col justify-center">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/dashboard/profile/${user.user_id}`} className="hover:underline font-bold text-sm flex items-center gap-1">
                                                        {user.nickname || user.nome}
                                                        {user.nickname === "Lóia" && <Ghost className="h-3.5 w-3.5 text-purple-500" />}
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

                {/* Legacy Spreadsheet Link */}
                {legacyUrl && (isAdmin || users.some(u => u.user_id === currentUser?.id)) && (
                    <div className="flex justify-center mt-6">
                        <a href={legacyUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="gap-2 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300">
                                <span className="font-semibold uppercase text-xs">Planilha Original de Resultados</span>
                                <ExternalLink className="h-4 w-4 text-primary" />
                            </Button>
                        </a>
                    </div>
                )}
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
