"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";
import { Button } from "@/components/ui/button";

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
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: champs } = await (supabase.from("championships") as any).select("*").neq("status", "arquivado");
            setChampionships(champs || []);

            const { data: profiles } = await (supabase.from("public_profiles") as any).select("*");
            setUsers(profiles || []);
        };
        fetchInitialData();
    }, []);

    const fetchMatches = async (page: number) => {
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = (supabase.from("matches") as any)
                .select("*", { count: "exact" })
                .eq("status", "finished")
                .order("date", { ascending: false })
                .range(from, to);

            if (selectedChampionship !== "all") {
                query = query.eq("championship_id", selectedChampionship);
            }

            const { data, count, error } = await query;
            if (error) throw error;

            const champMap = new Map(championships.map(c => [c.id, c]));
            const formattedMatches = (data as any[])?.map(m => {
                const champ = champMap.get(m.championship_id);
                return {
                    ...m,
                    championshipName: champ?.name || "Campeonato Desconhecido",
                    championshipLogoUrl: (champ as any)?.settings?.iconUrl
                };
            }) || [];

            setMatches(formattedMatches);
            setIsLastPage(count ? from + formattedMatches.length >= count : true);
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
    }, [selectedChampionship, championships]);

    const handleNextPage = () => {
        if (!isLastPage) fetchMatches(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) fetchMatches(currentPage - 1);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Histórico de Partidas</h1>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                        <SelectTrigger className="w-full sm:w-[260px]">
                            <SelectValue placeholder="Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Campeonatos</SelectItem>
                            {championships.map(c => (
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

                {(matches.length > 0 || currentPage > 1) && !loading && (
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
