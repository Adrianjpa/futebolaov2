"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface Championship {
    id: string;
    name: string;
    category?: string;
}

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    score_home: number;
    score_away: number;
    date: string;
    round: string;
    status: string;
    championship_id: string;
    championshipName?: string;
    teamMode?: any;
}

const ITEMS_PER_PAGE = 10;

export default function HistoryClient() {
    const supabase = createClient();
    const { user: currentUser, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isAdmin = profile?.funcao === 'admin' || profile?.funcao === 'moderator';

    // Read Initial Filters from URL
    const paramChamp = searchParams.get("championship");
    const paramUser = searchParams.get("user");
    const paramType = searchParams.get("type");

    const [championships, setChampionships] = useState<Championship[]>([]);
    const [userChampionships, setUserChampionships] = useState<Championship[]>([]);
    const [hasHistory, setHasHistory] = useState<boolean | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedChampionship, setSelectedChampionship] = useState<string>(paramChamp || "all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!currentUser) return;

            // 1. Fetch ALL championships
            const { data: allChamps } = await (supabase.from("championships") as any)
                .select("*")
                .order("created_at", { ascending: false });

            const champs = (allChamps || []) as Championship[];
            setChampionships(champs);

            // 2. Fetch User Participation
            const { data: participation } = await (supabase.from("championship_participants") as any)
                .select("championship_id")
                .eq("user_id", currentUser.id);

            const participatedIds = (participation || []).map((p: any) => p.championship_id);

            // 3. User might have predictions elsewhere
            const { data: predChamps } = await (supabase.from("predictions") as any)
                .select("matches(championship_id)")
                .eq("user_id", currentUser.id);

            const predictedIds = Array.from(new Set((predChamps || []).map((p: any) => p.matches?.championship_id).filter(Boolean)));
            const allUserChampIds = Array.from(new Set([...participatedIds, ...predictedIds]));

            const userHistoryChamps = champs.filter(c => allUserChampIds.includes(c.id));
            setUserChampionships(userHistoryChamps);
            const { data: profiles } = await (supabase.from("public_profiles") as any).select("*");
            setUsers(profiles || []);

            const hasAnyHistory = userHistoryChamps.length > 0 || isAdmin;
            setHasHistory(hasAnyHistory);

            // 4. Handle default selection or URL params
            if (paramChamp) {
                const champ = champs.find((c: Championship) => c.id === paramChamp);
                if (champ?.category) setSelectedCategory(champ.category);
                setSelectedChampionship(paramChamp);
            } else if (isAdmin && champs.length > 0) {
                // DEFAULT for Admin: Newest championship overall
                setSelectedChampionship(champs[0].id);
                setSelectedCategory(champs[0].category || "all");
            } else if (hasAnyHistory && userHistoryChamps.length > 0) {
                // DEFAULT: Newest championship user participated in
                const newest = userHistoryChamps[0];
                setSelectedChampionship(newest.id);
                setSelectedCategory(newest.category || "all");
            } else {
                setSelectedChampionship("all");
            }
        };
        fetchInitialData();
    }, [currentUser]);

    const fetchMatches = async (page: number) => {
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const champMap = new Map(championships.map((c: Championship) => [c.id, c]));
            let formattedMatches: Match[] = [];
            let totalCount = 0;

            // If we have a user AND a type filter, we MUST fetch all to filter correctly client-side
            if (paramUser && paramType) {
                let query = (supabase.from("predictions") as any)
                    .select("*, matches(*)")
                    .eq("user_id", paramUser);

                if (selectedChampionship !== "all") {
                    query = query.filter("matches.championship_id", "eq", selectedChampionship);
                }

                query = query.order("date", { foreignTable: "matches", ascending: false });

                const { data, error } = await query;
                if (error) throw error;

                const filtered = (data as any[])?.map(p => {
                    const m = p.matches;
                    if (!m) return null;

                    const ph = p.home_score;
                    const pa = p.away_score;
                    const mh = m.score_home;
                    const ma = m.score_away;

                    if (mh === null || ma === null) return null;

                    const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
                    const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);

                    const isBucha = ph === mh && pa === ma;
                    const isSituacao = !isBucha && winP === winM;
                    const isErro = winP !== winM;

                    if (paramType === "bucha" && !isBucha) return null;
                    if (paramType === "situacao" && !isSituacao) return null;
                    if (paramType === "erro" && !isErro) return null;

                    const champ = champMap.get(m.championship_id);
                    return {
                        ...m,
                        championshipName: champ?.name || "Campeonato Desconhecido",
                        championshipLogoUrl: (champ as any)?.settings?.iconUrl,
                        teamMode: (champ as any)?.settings?.teamMode || 'clubes'
                    };
                }).filter(Boolean) || [];

                totalCount = filtered.length;
                formattedMatches = filtered.slice(from, to + 1);
            } else {
                let query;
                if (paramUser) {
                    query = (supabase.from("predictions") as any)
                        .select("*, matches(*)", { count: "exact" })
                        .eq("user_id", paramUser);
                    query = query.order("date", { foreignTable: "matches", ascending: false });
                    if (selectedChampionship !== "all") {
                        query = query.filter("matches.championship_id", "eq", selectedChampionship);
                    }
                } else {
                    query = (supabase.from("matches") as any)
                        .select("*", { count: "exact" })
                        .eq("status", "finished")
                        .order("date", { ascending: false });
                    if (selectedChampionship !== "all") {
                        query = query.eq("championship_id", selectedChampionship);
                    }
                }

                const { data, count, error } = await query.range(from, to);
                if (error) throw error;

                totalCount = count || 0;
                formattedMatches = (data as any[])?.map(item => {
                    const m = paramUser ? item.matches : item;
                    if (!m) return null;
                    const champ = champMap.get(m.championship_id);
                    return {
                        ...m,
                        championshipName: champ?.name || "Campeonato Desconhecido",
                        championshipLogoUrl: (champ as any)?.settings?.iconUrl,
                        teamMode: (champ as any)?.settings?.teamMode || 'clubes'
                    };
                }).filter(Boolean) || [];
            }

            setMatches(formattedMatches);
            setTotalCount(totalCount);
            setIsLastPage(from + formattedMatches.length >= totalCount);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching history matches:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (championships.length > 0) {
            fetchMatches(1);
        }
    }, [selectedChampionship, championships, paramUser, paramType]);

    const handleNextPage = () => {
        if (!isLastPage) fetchMatches(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) fetchMatches(currentPage - 1);
    };

    const handleCategoryChange = (val: string) => {
        setSelectedCategory(val);
        if (val !== "all") {
            const inCat = championships
                .filter(c => c.category === val)
                .sort((a, b) => new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime());

            if (inCat.length > 0) {
                setSelectedChampionship(inCat[0].id);
            } else {
                setSelectedChampionship("all");
            }
        } else {
            setSelectedChampionship("all");
        }
    };

    const isFiltered = !!paramUser || !!paramType;
    const showPagination = (currentPage > 1 || !isLastPage) && matches.length > 0;

    const availableCategories = Array.from(new Set(championships.map((c: Championship) => c.category || "other"))).sort();
    const filteredChampionships = selectedCategory === "all"
        ? (isAdmin ? championships : userChampionships)
        : (isAdmin ? championships : userChampionships).filter((c: Championship) => (c.category || "other") === selectedCategory);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    {paramType === 'bucha' ? 'Minhas Buchas' :
                        paramType === 'situacao' ? 'Minhas Situações' :
                            paramType === 'erro' ? 'Meus Erros' :
                                'Histórico de Partidas'}
                </h1>

                {hasHistory && (
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        {isFiltered && (
                            <Button variant="ghost" onClick={() => router.push('/dashboard/history')} className="text-muted-foreground h-10 px-4">
                                Limpar Filtros
                            </Button>
                        )}

                        {/* Filter by Category (Grouping) */}
                        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="w-full sm:w-[200px] h-10">
                                <SelectValue placeholder="Agrupamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Agrupamentos</SelectItem>
                                {availableCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        {CATEGORY_MAP[cat] || cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filter by Championship */}
                        <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                            <SelectTrigger className="w-full sm:w-[240px] h-10">
                                <SelectValue placeholder="Campeonato" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos {selectedCategory !== 'all' ? `da ${CATEGORY_MAP[selectedCategory] || selectedCategory}` : 'os Campeonatos'}</SelectItem>
                                {filteredChampionships.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {loading && (
                    <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">Carregando histórico...</p>
                    </div>
                )}

                {!loading && hasHistory === false && (
                    <div className="text-center py-20 bg-card/30 border border-dashed rounded-2xl m-4 animate-in fade-in zoom-in duration-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-bold">Histórico Vazio</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-2 px-4 leading-relaxed">
                            Parece que você ainda não participou de nenhum campeonato que tenha partidas finalizadas. Participe de um bolão para ver seu histórico aqui!
                        </p>
                    </div>
                )}

                {!loading && hasHistory === true && matches.length === 0 && (
                    <div className="text-center py-20 bg-card/30 border border-dashed rounded-2xl m-4">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-muted-foreground">Nenhuma partida finalizada encontrada para este filtro.</p>
                    </div>
                )}

                {!loading && hasHistory && matches.map((match) => (
                    <UnifiedMatchCard
                        key={match.id}
                        match={match}
                        users={users}
                        finished
                        isAdmin={isAdmin}
                        onUpdate={() => fetchMatches(currentPage)}
                        showBetButton={false}
                        showChampionshipName={selectedChampionship === 'all'}
                        teamMode={match.teamMode as any}
                    />
                ))}

                {!loading && hasHistory && showPagination && (
                    <div className="flex flex-col items-center gap-4 pt-6 border-t">
                        <div className="flex items-center justify-between w-full">
                            <Button variant="outline" onClick={handlePrevPage} disabled={currentPage === 1} className="w-[100px] sm:w-[120px] text-xs">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                            </Button>

                            <div className="hidden sm:flex items-center gap-1">
                                {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }).map((_, i) => {
                                    const p = i + 1;
                                    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

                                    // Show first, last, and pages around current
                                    if (
                                        p === 1 ||
                                        p === totalPages ||
                                        (p >= currentPage - 1 && p <= currentPage + 1)
                                    ) {
                                        return (
                                            <Button
                                                key={p}
                                                variant={currentPage === p ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => fetchMatches(p)}
                                                className="h-8 w-8 text-xs p-0"
                                            >
                                                {p}
                                            </Button>
                                        );
                                    }

                                    if (p === currentPage - 2 || p === currentPage + 2) {
                                        return <span key={p} className="text-muted-foreground">...</span>;
                                    }

                                    return null;
                                })}
                            </div>

                            <span className="sm:hidden text-xs font-bold text-muted-foreground">
                                {currentPage} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                            </span>

                            <Button variant="outline" onClick={handleNextPage} disabled={isLastPage} className="w-[100px] sm:w-[120px] text-xs">
                                Próxima <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest bg-muted/30 px-3 py-1 rounded-full">
                            Total de {totalCount} partidas encontradas
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
