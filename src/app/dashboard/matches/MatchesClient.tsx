"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedMatchCard } from "@/components/UnifiedMatchCard";

interface Championship {
    id: string;
    name: string;
    status: string;
    category?: string;
    settings?: {
        type: 'MANUAL' | 'AUTO' | 'HYBRID';
        iconUrl?: string;
    };
}

interface Team {
    id: string;
    name: string;
    shortName: string;
}

interface Match {
    id: string;
    championship_id: string;
    round: number;
    date: string;
    status: string;
    home_team: string;
    away_team: string;
    score_home: number;
    score_away: number;
    championshipName?: string;
}

const ITEMS_PER_PAGE = 10;

import { useMatches } from "@/contexts/MatchesContext";

export default function MatchesClient() {
    const { profile, user: authUser } = useAuth();
    const {
        matches: allActiveMatches,
        championships: allChamps,
        userPredictions,
        loading: matchesLoading,
        refreshMatches: fetchMatches
    } = useMatches();

    const isAdmin = profile?.funcao === 'admin' || profile?.funcao === 'moderator';
    const supabase = createClient();

    const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);

    // Form State (Admin)
    const [homeTeam, setHomeTeam] = useState("");
    const [awayTeam, setAwayTeam] = useState("");
    const [matchDate, setMatchDate] = useState("");
    const [matchTime, setMatchTime] = useState("");
    const [round, setRound] = useState(1);

    const fetchUsers = async () => {
        const { data } = await (supabase.from("public_profiles") as any).select("*");
        setUsers(data || []);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        // Filter matches from context based on selection
        let filtered = allActiveMatches.filter(m => m.status === 'scheduled');

        if (selectedChampionship !== "all") {
            filtered = filtered.filter(m => m.championship_id === selectedChampionship);
        }

        // Apply pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        const paginated = filtered.slice(from, to);

        setMatches(paginated);
        setIsLastPage(to >= filtered.length);
    }, [allActiveMatches, selectedChampionship, currentPage]);

    const handleNextPage = () => {
        if (!isLastPage) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleAddMatch = async () => {
        if (!selectedChampionship || selectedChampionship === "all" || !homeTeam || !awayTeam || !matchDate || !matchTime) {
            alert("Preencha todos os campos.");
            return;
        }

        const dateTime = new Date(`${matchDate}T${matchTime}`);

        try {
            const { error } = await (supabase.from("matches") as any).insert({
                championship_id: selectedChampionship,
                home_team: homeTeam,
                away_team: awayTeam,
                date: dateTime.toISOString(),
                round: Number(round),
                status: "scheduled"
            });

            if (error) throw error;

            setIsDialogOpen(false);
            setHomeTeam("");
            setAwayTeam("");
            setMatchDate("");
            setMatchTime("");
            fetchMatches();
            alert("Partida criada com sucesso!");
        } catch (error: any) {
            console.error("Error adding match:", error);
            alert("Erro ao criar partida: " + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Próximas Partidas</h1>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                        <SelectTrigger className="w-full sm:w-[260px]">
                            <SelectValue placeholder="Campeonato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Campeonatos</SelectItem>
                            {allChamps.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isAdmin && (
                        (() => {
                            const currentChamp = allChamps.find((c: any) => c.id === selectedChampionship);
                            const isManual = currentChamp?.settings?.type === 'MANUAL';
                            const isAll = selectedChampionship === "all";

                            // Se for Todos, mostramos desativado para o usuário saber que precisa filtrar para criar
                            if (isAll) {
                                return (
                                    <Button disabled title="Selecione um campeonato específico para criar uma partida">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nova
                                    </Button>
                                );
                            }

                            // Se não for manual (Auto ou Híbrido), não mostramos o botão
                            if (!isManual) return null;

                            return (
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Nova
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Agendar Partida</DialogTitle>
                                            <DialogDescription>Preencha os dados abaixo para agendar uma nova partida no campeonato selecionado.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Time Mandante</Label>
                                                    <Input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="Nome do time" />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Time Visitante</Label>
                                                    <Input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="Nome do time" />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Data e Hora</Label>
                                                <div className="flex gap-2">
                                                    <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
                                                    <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Rodada / Fase</Label>
                                                <Input type="number" value={round} onChange={e => setRound(Number(e.target.value))} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleAddMatch}>Agendar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            );
                        })()
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {matches.length === 0 && !matchesLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Nenhuma partida agendada encontrada.</p>
                    </div>
                )}

                {matchesLoading && matches.length === 0 && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}

                {matches.map((match) => (
                    <UnifiedMatchCard
                        key={match.id}
                        match={match}
                        users={users}
                        live={match.status === 'live'}
                        showBetButton={!isAdmin}
                        hasPrediction={userPredictions.has(match.id)}
                        isAdmin={isAdmin}
                        onUpdate={() => fetchMatches()}
                        showChampionshipName={selectedChampionship === 'all'}
                    />
                ))}
            </div>

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
    );
}
