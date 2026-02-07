"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Trophy as TrophyIcon, Award, Info, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TEAM_ISO_MAP: Record<string, string> = {
    'Polônia': 'pl', 'Grécia': 'gr', 'Rússia': 'ru', 'República Tcheca': 'cz',
    'Holanda': 'nl', 'Dinamarca': 'dk', 'Alemanha': 'de', 'Portugal': 'pt',
    'Espanha': 'es', 'Itália': 'it', 'Irlanda': 'ie', 'Croácia': 'hr',
    'França': 'fr', 'Inglaterra': 'gb-eng', 'Ucrânia': 'ua', 'Suécia': 'se'
};

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
        championshipsMap,
        userPredictions,
        userParticipation,
        loading: matchesLoading,
        refreshMatches: fetchMatches
    } = useMatches();

    const isAdmin = profile?.funcao === 'admin' || profile?.funcao === 'moderator';
    const supabase = createClient();

    const searchParams = useSearchParams();
    const champParam = searchParams.get("championship");

    const [selectedChampionship, setSelectedChampionship] = useState<string>(champParam || "all");
    const [matches, setMatches] = useState<Match[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Form State (Admin)
    const [homeTeam, setHomeTeam] = useState("");
    const [awayTeam, setAwayTeam] = useState("");
    const [matchDate, setMatchDate] = useState("");
    const [matchTime, setMatchTime] = useState("");
    const [round, setRound] = useState(1);
    const [userSelection, setUserSelection] = useState<string[]>([]);
    const [isSelectionLocked, setIsSelectionLocked] = useState(false);
    const [officialRanking, setOfficialRanking] = useState<string[]>([]);
    const [championshipTeams, setChampionshipTeams] = useState<any[]>([]);
    const [bannerEnabled, setBannerEnabled] = useState(false);
    const [selectionSlots, setSelectionSlots] = useState(3);

    const fetchUsers = async () => {
        const { data } = await (supabase.from("public_profiles") as any).select("*");
        setUsers(data || []);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const activeChamps = useMemo(() => {
        return allChamps.filter((c: any) =>
            (c.status === 'ativo' || c.status === 'agendado') && (isAdmin || userParticipation.has(c.id))
        );
    }, [allChamps, isAdmin, userParticipation]);

    // Set default championship
    useEffect(() => {
        if (champParam) {
            setSelectedChampionship(champParam);
            return;
        }

        if (activeChamps.length > 0 && selectedChampionship === "all") {
            // If only one, select it automatically. If multiple, keep "all" as default to show everything in order.
            if (activeChamps.length === 1) {
                setSelectedChampionship(activeChamps[0].id);
            }
        }
    }, [activeChamps, selectedChampionship, champParam]);

    // Handle filtering and pagination
    useEffect(() => {
        // Only show scheduled matches of active championships
        const activeChampIds = activeChamps.map(c => c.id);
        let filtered = allActiveMatches.filter(m =>
            activeChampIds.includes(m.championship_id) &&
            m.status === 'scheduled'
        );

        if (selectedChampionship !== "all") {
            filtered = filtered.filter(m => m.championship_id === selectedChampionship);
        }

        const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageMatches = sorted.slice(start, end);

        setMatches(pageMatches as any);
        setTotalCount(sorted.length);
        setIsLastPage(end >= sorted.length);
    }, [allActiveMatches, selectedChampionship, currentPage, activeChamps]);

    const categories = Array.from(new Set(activeChamps.map((c: any) => c.category).filter(Boolean)));

    const fetchChampionshipData = async () => {
        if (selectedChampionship === "all" || !authUser) {
            setUserSelection([]);
            setIsSelectionLocked(false);
            setOfficialRanking([]);
            setChampionshipTeams([]);
            return;
        }

        try {
            // 1. Fetch Participant data (selections)
            const { data: part } = await supabase
                .from("championship_participants")
                .select("team_selections")
                .eq("championship_id", selectedChampionship)
                .eq("user_id", authUser.id)
                .single();

            if (part) setUserSelection((part as any).team_selections || []);

            // 2. Fetch Champ settings (ranking & lock status)
            const { data: champ } = await supabase
                .from("championships")
                .select("settings, status")
                .eq("id", selectedChampionship)
                .single();

            if (champ) {
                const settings = ((champ as any).settings as any) || {};
                setOfficialRanking(settings.officialRanking || []);
                setChampionshipTeams(settings.teams || []);
                setBannerEnabled(settings.bannerEnabled ?? false);
                setSelectionSlots(settings.selectionSlots ?? 3);

                // Check if first match started
                const { data: firstMatch } = await supabase
                    .from("matches")
                    .select("date")
                    .eq("championship_id", selectedChampionship)
                    .order("date", { ascending: true })
                    .limit(1)
                    .single();

                if (firstMatch) {
                    const now = new Date();
                    const matchDate = new Date((firstMatch as any).date);
                    setIsSelectionLocked(now >= matchDate || (champ as any).status === 'finalizado');
                }
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchChampionshipData();
    }, [selectedChampionship, authUser, supabase]);

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
                    {/* FILTRO DE CAMPEONATO - Somente se houver mais de 1 ativo */}
                    {activeChamps.length > 1 && (
                        <Select
                            value={selectedChampionship}
                            onValueChange={(val) => {
                                setSelectedChampionship(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[260px]">
                                <SelectValue placeholder="Campeonato" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeChamps.length > 1 && <SelectItem value="all">Todos os Campeonatos</SelectItem>}
                                {activeChamps.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {isAdmin && (
                        (() => {
                            // Se for Admin e tiver um campeonato selecionado, permite criar
                            const currentChamp = activeChamps.find((c: any) => c.id === selectedChampionship);
                            const isManual = currentChamp?.settings?.type === 'MANUAL';
                            const isAll = selectedChampionship === "all";

                            if (isAll) return null; // Admin precisa escolher um campeonato específico para criar partida
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
                                            <DialogDescription>
                                                Criando partida para: <b>{currentChamp.name}</b>
                                            </DialogDescription>
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

            {/* BANNER DE SELEÇÕES (Favoritos) - Regras de Visibilidade:
                1. Não aparece para ADMIN
                2. Aparece se houver um campeonato selecionado (via agrupamento)
                3. Aparece apenas se bannerEnabled estiver ativo no campeonato
            */}
            {selectedChampionship !== "all" && !isAdmin && bannerEnabled && (
                <Card className="mb-6 overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-blue-950/20 to-slate-950/40 backdrop-blur-md relative group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 sm:p-6 relative">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                    <Award className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                                        Favoritos do Campeonato
                                        {isSelectionLocked && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {isSelectionLocked ? "Escolhas encerradas. Veja seus acertos!" : "Escolha suas equipes favoritas antes do 1º jogo!"}
                                    </p>
                                </div>
                            </div>

                            {/* EXIBIÇÃO DAS BANDEIRAS */}
                            <div className="flex items-center gap-3 sm:gap-6">
                                {Array.from({ length: selectionSlots }).map((_, idx) => {
                                    const team = userSelection[idx];
                                    const iso = TEAM_ISO_MAP[team] || 'xx';
                                    const isCorrect = officialRanking.includes(team);
                                    // SÓ MOSTRA FADE SE O RANKING OFICIAL TIVER SIDO PREENCHIDO
                                    const isRankingReady = officialRanking.some(r => r && r !== "");
                                    const showFade = isRankingReady && !isCorrect;

                                    const currentChamp = allChamps.find((c: any) => c.id === selectedChampionship);
                                    const currentTeamMode = currentChamp?.settings?.teamMode || 'clubes';

                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-900/40 border border-white/5 transition-all hover:bg-slate-900/60 min-w-[70px] sm:min-w-[80px]">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">{idx + 1}º Opção</span>
                                            {team ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={`transition-all duration-700 ${showFade ? "opacity-20 grayscale blur-[1px] scale-90" : "opacity-100 scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"}`}>
                                                                <img
                                                                    src={`https://flagcdn.com/w80/${iso}.png`}
                                                                    alt={team}
                                                                    className={cn(
                                                                        "shadow-lg border border-white/10 transition-all",
                                                                        currentTeamMode === 'selecoes'
                                                                            ? "h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-full"
                                                                            : "h-6 sm:h-8 w-10 sm:w-12 object-cover rounded"
                                                                    )}
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className={showFade ? "opacity-70 line-through" : "font-bold"}>
                                                            {team} {showFade ? "(Eliminado)" : ""}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <div className="h-6 sm:h-8 w-10 sm:w-12 bg-slate-800/50 rounded border border-dashed border-white/10 flex items-center justify-center">
                                                    <Plus className="h-3 w-3 text-white/20" />
                                                </div>
                                            )}
                                            <span className={`text-[9px] sm:text-[10px] font-bold truncate max-w-[65px] sm:max-w-[70px] ${showFade ? "opacity-30 line-through" : "text-slate-200"}`}>
                                                {team || "Pendente"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* BOTÃO DE EDIÇÃO (Se não estiver bloqueado) */}
                            {!isSelectionLocked && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="text-xs font-bold bg-primary/10 border-primary/20 hover:bg-primary/20">
                                            {userSelection.length > 0 ? "Alterar" : "Escolher"}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] bg-slate-950 border-white/10">
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-bold text-slate-100">Suas Escolhas de Favoritos</DialogTitle>
                                            <DialogDescription className="text-slate-400">
                                                Selecione as 3 seleções que você acredita que chegarão no topo.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-6 py-4">
                                            {Array.from({ length: selectionSlots }).map((_, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <Label className="text-slate-300 font-bold">{idx + 1}º Opção</Label>
                                                    <Select
                                                        value={userSelection[idx]}
                                                        onValueChange={(val) => {
                                                            const newSel = [...userSelection];
                                                            newSel[idx] = val;
                                                            setUserSelection(newSel);
                                                        }}
                                                    >
                                                        <SelectTrigger className="bg-slate-900/50 border-white/10">
                                                            <SelectValue placeholder="Selecione uma seleção..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10">
                                                            {championshipTeams.map((t: any) => (
                                                                <SelectItem key={t.id} value={t.name} disabled={userSelection.includes(t.name) && userSelection[idx] !== t.name}>
                                                                    <div className="flex items-center gap-2">
                                                                        {TEAM_ISO_MAP[t.name] && <img src={`https://flagcdn.com/w20/${TEAM_ISO_MAP[t.name]}.png`} className="h-3 w-4 object-contain" />}
                                                                        {t.name}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                className="w-full bg-primary hover:bg-primary/90"
                                                onClick={async () => {
                                                    try {
                                                        const { error } = await (supabase
                                                            .from("championship_participants") as any)
                                                            .upsert({
                                                                championship_id: selectedChampionship,
                                                                user_id: authUser?.id,
                                                                team_selections: userSelection
                                                            }, { onConflict: 'championship_id,user_id' });

                                                        if (error) throw error;
                                                        alert("Escolhas salvas com sucesso!");
                                                        fetchChampionshipData();
                                                    } catch (e: any) {
                                                        alert("Erro ao salvar: " + e.message);
                                                    }
                                                }}
                                            >
                                                Salvar Favoritos
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                {matchesLoading && matches.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">Carregando partidas...</p>
                    </div>
                )}

                {matches.length === 0 && !matchesLoading && (
                    <div className="text-center py-20 bg-card/30 border border-dashed rounded-2xl m-4 animate-in fade-in zoom-in duration-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-bold">Sem Partidas</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed">
                            Nenhuma partida agendada encontrada para os filtros selecionados.
                        </p>
                    </div>
                )}

                {matches.map((match) => {
                    const champ = championshipsMap[match.championship_id];
                    const teamMode = champ?.settings?.teamMode || 'clubes';
                    return (
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
                            teamMode={teamMode}
                        />
                    );
                })}
            </div>

            {(matches.length > 0 || currentPage > 1) && !loading && (
                <div className="flex flex-col items-center gap-4 pt-6 border-t">
                    <div className="flex items-center justify-between w-full">
                        <Button variant="outline" onClick={handlePrevPage} disabled={currentPage === 1} className="w-[100px] sm:w-[120px] text-xs">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                        </Button>

                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: Math.ceil(totalCount / ITEMS_PER_PAGE) }).map((_, i) => {
                                const p = i + 1;
                                const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
                                            onClick={() => setCurrentPage(p)}
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
                        Total de {totalCount} partidas agendadas
                    </div>
                </div>
            )}
        </div>
    );
}
