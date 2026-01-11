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
}

const ITEMS_PER_PAGE = 10;

export default function HistoryClient() {
    const supabase = createClient();
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Read Initial Filters from URL
    const paramChamp = searchParams.get("championship");
    const paramUser = searchParams.get("user");
    const paramType = searchParams.get("type");

    const [championships, setChampionships] = useState<Championship[]>([]);
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

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: champs } = await (supabase.from("championships") as any).select("*").neq("status", "arquivado");
            const allChamps = champs || [];
            setChampionships(allChamps);

            const { data: profiles } = await (supabase.from("public_profiles") as any).select("*");
            setUsers(profiles || []);

            // If we have a paramChamp, find its category and set it
            if (paramChamp) {
                const champ = (allChamps as Championship[]).find((c: Championship) => c.id === paramChamp);
                if (champ?.category) {
                    setSelectedCategory(champ.category);
                }
            }
        };
        fetchInitialData();
    }, []);

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

                query = query.order("date", { foreignTable: "matches", ascending: true });

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
                        championshipLogoUrl: (champ as any)?.settings?.iconUrl
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
                    query = query.order("date", { foreignTable: "matches", ascending: true });
                    if (selectedChampionship !== "all") {
                        query = query.filter("matches.championship_id", "eq", selectedChampionship);
                    }
                } else {
                    query = (supabase.from("matches") as any)
                        .select("*", { count: "exact" })
                        .eq("status", "finished")
                        .order("date", { ascending: true });
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
                        championshipLogoUrl: (champ as any)?.settings?.iconUrl
                    };
                }).filter(Boolean) || [];
            }

            setMatches(formattedMatches);
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
        // Reset championship if it's not under the new category
        if (val !== "all") {
            const champ = championships.find(c => c.id === selectedChampionship);
            if (champ && champ.category !== val) {
                setSelectedChampionship("all");
            }
        }
    };

    const isFiltered = !!paramUser || !!paramType;
    const showPagination = (currentPage > 1 || !isLastPage) && matches.length > 0;

    const availableCategories = Array.from(new Set(championships.map((c: Championship) => c.category || "other"))).sort();
    const filteredChampionships = selectedCategory === "all"
        ? championships
        : championships.filter((c: Championship) => (c.category || "other") === selectedCategory);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    {paramType === 'bucha' ? 'Minhas Buchas' :
                        paramType === 'situacao' ? 'Minhas Situações' :
                            paramType === 'erro' ? 'Meus Erros' :
                                'Histórico de Partidas'}
                </h1>

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
            </div>

            <div className="grid gap-4">
                {matches.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma partida finalizada encontrada.</p>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {!loading && matches.map((match) => (
                    <UnifiedMatchCard
                        key={match.id}
                        match={match}
                        users={users}
                        finished
                        showBetButton={false}
                        showChampionshipName={selectedChampionship === 'all'}
                    />
                ))}

                {showPagination && !loading && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <Button variant="outline" onClick={handlePrevPage} disabled={currentPage === 1} className="w-[120px]">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground font-mono">Página {currentPage}</span>
                        <Button variant="outline" onClick={handleNextPage} disabled={isLastPage} className="w-[120px]">
                            Próxima <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
