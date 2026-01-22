"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, Calendar, Trophy, Edit, Trash2, Archive, RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { getFlagUrl, cn } from "@/lib/utils";

interface Championship {
    id: string;
    name: string;
    category: string;
    status: string;
    settings: any;
    created_at: string;
}

export default function ChampionshipDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [championship, setChampionship] = useState<Championship | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const supabase = createClient();

    const handleSyncSchedule = async () => {
        if (!championship) return;
        setSyncing(true);
        try {
            const response = await fetch("/api/admin/sync-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ championshipId: championship.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erro ao sincronizar");
            alert(data.message || "Sincronização concluída!");
        } catch (error: any) {
            console.error("Sync error:", error);
            alert(`Erro: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const fetchChampionship = async () => {
            if (!params.id) return;
            try {
                const { data, error } = await supabase
                    .from("championships")
                    .select("*")
                    .eq("id", params.id)
                    .single();

                if (error) throw error;
                if (data) {
                    setChampionship(data as Championship);
                } else {
                    alert("Campeonato não encontrado");
                    router.push("/admin/championships");
                }
            } catch (error) {
                console.error("Error fetching championship:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChampionship();
    }, [params.id, router, supabase]);

    const handleDelete = async () => {
        if (!championship) return;

        setIsDeleting(true);
        try {
            // In Supabase, ON DELETE CASCADE should handle matches and predictions if set up in SQL.
            // If not, we do it manually.

            // 1. Delete Predictions
            await (supabase.from("predictions") as any).delete().eq("championship_id", championship.id);

            // 2. Delete Matches
            await (supabase.from("matches") as any).delete().eq("championship_id", championship.id);

            // 3. Delete Championship
            const { error } = await (supabase.from("championships") as any).delete().eq("id", championship.id);
            if (error) throw error;

            alert("Campeonato excluído com sucesso!");
            router.push("/admin/championships");
        } catch (error: any) {
            console.error("Erro ao excluir:", error);
            alert(`Erro ao excluir campeonato: ${error.message}`);
        } finally {
            setIsDeleting(false);
            setIsDeleteOpen(false);
        }
    };

    const handleArchive = async () => {
        if (!championship) return;
        const newStatus = championship.status === "arquivado" ? "ativo" : "arquivado";
        const confirmMessage = newStatus === "arquivado"
            ? "Tem certeza que deseja arquivar este campeonato? Ele não aparecerá mais na lista principal."
            : "Tem certeza que deseja desarquivar este campeonato?";

        if (!confirm(confirmMessage)) return;

        try {
            const { error } = await (supabase
                .from("championships") as any)
                .update({ status: newStatus as any })
                .eq("id", championship.id);

            if (error) throw error;
            setChampionship({ ...championship, status: newStatus });
            alert(`Campeonato ${newStatus === "arquivado" ? "arquivado" : "desarquivado"} com sucesso!`);
            router.push("/admin/championships");
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status do campeonato.");
        }
    };

    const handleImportMatches = async () => {
        const apiCode = championship?.settings?.apiCode;
        if (!apiCode) return;

        setImporting(true);
        try {
            const response = await fetch(`/api/football-data/matches?code=${apiCode}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Falha ao buscar jogos na API.");

            const apiMatches = data.matches;
            if (!apiMatches || apiMatches.length === 0) {
                alert("Nenhum jogo encontrado na API.");
                return;
            }

            // Filtrar jogos que ainda não têm times definidos (comum em mata-mata/Champions League)
            const validMatches = apiMatches.filter((m: any) =>
                m.homeTeam && m.homeTeam.name &&
                m.awayTeam && m.awayTeam.name
            );

            if (validMatches.length === 0) {
                alert("A API retornou jogos, mas nenhum deles tem os times definidos ainda (comum em fases futuras de mata-mata).");
                setImporting(false);
                return;
            }

            const matchesToUpsert = validMatches.map((match: any) => {
                let status = "scheduled";
                if (match.status === "FINISHED") status = "finished";
                else if (match.status === "IN_PLAY" || match.status === "PAUSED") status = "live";

                const scoreType = championship.settings?.apiScoreType || 'fullTime';
                let homeScore = null;
                let awayScore = null;

                if (scoreType === 'regularTime' && match.score?.regularTime) {
                    homeScore = match.score.regularTime.home ?? null;
                    awayScore = match.score.regularTime.away ?? null;
                } else {
                    homeScore = match.score?.fullTime?.home ?? null;
                    awayScore = match.score?.fullTime?.away ?? null;
                }
                if (status === "live") {
                    if (homeScore === null) homeScore = 0;
                    if (awayScore === null) awayScore = 0;
                }

                return {
                    championship_id: championship.id,
                    external_id: match.id.toString(),
                    home_team: match.homeTeam.name,
                    away_team: match.awayTeam.name,
                    home_team_crest: match.homeTeam.crest,
                    away_team_crest: match.awayTeam.crest,
                    date: new Date(match.utcDate).toISOString(),
                    round: match.matchday || 0,
                    round_name: match.stage ? match.stage.replace(/_/g, " ") : null,
                    status: status,
                    score_home: homeScore,
                    score_away: awayScore,
                };
            });

            const { error } = await (supabase.from("matches") as any).upsert(matchesToUpsert, { onConflict: 'championship_id,external_id' });

            if (error) {
                console.error("Upsert error:", error);
                // Fallback attempt
                const { error: error2 } = await (supabase.from("matches") as any).upsert(matchesToUpsert);
                if (error2) throw new Error(`Erro no banco de dados: ${error2.message}`);
            }

            alert(`Processamento de ${matchesToUpsert.length} matches concluído!`);

        } catch (error: any) {
            console.error("Error importing matches:", error);
            alert(`Erro ao importar jogos: ${error.message}`);
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!championship) return null;

    const apiCode = championship.settings?.apiCode;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{championship.name}</h1>
                <Badge variant={championship.status === "ativo" ? "default" : "secondary"}>
                    {championship.status}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Categoria:</span>
                            <span className="font-medium capitalize">{championship.category || "Geral"}</span>
                        </div>
                        {apiCode && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Código API:</span>
                                <Badge variant="outline">{apiCode}</Badge>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Criado em:</span>
                            <span>{championship.created_at ? format(parseISO(championship.created_at), "dd/MM/yyyy") : "-"}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Link href={`/admin/championships/${championship.id}/edit`} className="w-full">
                                <Button variant="outline" className="w-full">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            </Link>
                            <Button variant="secondary" className="w-full" onClick={handleArchive}>
                                {championship.status === "arquivado" ? (
                                    <>
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                        Desarquivar
                                    </>
                                ) : (
                                    <>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Arquivar
                                    </>
                                )}
                            </Button>
                            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Excluir Campeonato</DialogTitle>
                                        <DialogDescription>
                                            Tem certeza que deseja excluir este campeonato? Esta ação não pode ser desfeita e apagará permanentemente todos os jogos e palpites associados.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                                            Cancelar
                                        </Button>
                                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Exclusão"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {apiCode && (
                                <Button
                                    variant="outline"
                                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                    onClick={handleSyncSchedule}
                                    disabled={syncing}
                                >
                                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Sincronizar
                                </Button>
                            )}
                        </div>

                        {apiCode && (
                            <Button
                                onClick={handleImportMatches}
                                disabled={importing}
                                className="w-full"
                            >
                                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                Importar Jogos da API
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Jogos Importados</CardTitle>
                </CardHeader>
                <CardContent>
                    <MatchList championshipId={championship.id} teamMode={championship.settings?.teamMode} />
                </CardContent>
            </Card>
        </div>
    );
}

function MatchList({ championshipId, teamMode }: { championshipId: string, teamMode?: string }) {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchMatches = async () => {
            const { data } = await supabase
                .from("matches")
                .select("*")
                .eq("championship_id", championshipId)
                .order("date", { ascending: true });

            setMatches(data || []);
            setLoading(false);
        };

        fetchMatches();

        // Real-time subscription
        const channel = supabase
            .channel(`matches-${championshipId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `championship_id=eq.${championshipId}` }, () => {
                fetchMatches();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [championshipId, supabase]);

    // Pagination Logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(matches.length / itemsPerPage);

    const paginatedMatches = matches.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
    const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));

    if (loading) return <div className="text-center p-4">Carregando jogos...</div>;
    if (matches.length === 0) return <div className="text-center text-muted-foreground p-4">Nenhum jogo importado ainda.</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Total: {matches.length} jogos</span>
                <span>Página {currentPage} de {totalPages}</span>
            </div>

            <TooltipProvider>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedMatches.map((match) => (
                        <div key={match.id} className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-card/80 to-card border border-border/50 hover:border-primary/30 transition-all group overflow-hidden shadow-sm hover:shadow-md h-[200px]">

                            {/* Rodada (Topo) */}
                            <div className="absolute top-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">
                                {match.round_name || (match.round ? `Rodada ${match.round}` : "-")}
                            </div>

                            {/* Conteúdo Central (Escudos e Placar) */}
                            <div className="flex items-center justify-center gap-4 w-full mt-2">
                                {/* Home Team */}
                                <div className="flex flex-col items-center gap-2 w-24">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative h-12 w-12 transition-transform hover:scale-110 cursor-help">
                                                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <img
                                                    src={match.home_team_crest || getFlagUrl(match.home_team)}
                                                    alt={match.home_team}
                                                    className={cn(
                                                        "h-full w-full drop-shadow-lg",
                                                        teamMode === 'selecoes' ? "rounded-full object-cover border border-white/10" : "object-contain"
                                                    )}
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-bold">{match.home_team}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-[10px] font-medium text-center leading-tight text-muted-foreground truncate w-full px-1">
                                        {match.home_team}
                                    </span>
                                </div>

                                {/* Placar */}
                                <div className="flex flex-col items-center justify-center -mt-4">
                                    <div className={`text-2xl font-black font-mono tracking-tighter ${match.status === 'live' ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                                        {match.status !== 'scheduled' ? (
                                            <span className="flex gap-2">
                                                <span>{match.score_home ?? 0}</span>
                                                <span className="text-muted-foreground/30">:</span>
                                                <span>{match.score_away ?? 0}</span>
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/20 text-xl">VS</span>
                                        )}
                                    </div>
                                </div>

                                {/* Away Team */}
                                <div className="flex flex-col items-center gap-2 w-24">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative h-12 w-12 transition-transform hover:scale-110 cursor-help">
                                                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <img
                                                    src={match.away_team_crest || getFlagUrl(match.away_team)}
                                                    alt={match.away_team}
                                                    className={cn(
                                                        "h-full w-full drop-shadow-lg",
                                                        teamMode === 'selecoes' ? "rounded-full object-cover border border-white/10" : "object-contain"
                                                    )}
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-bold">{match.away_team}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-[10px] font-medium text-center leading-tight text-muted-foreground truncate w-full px-1">
                                        {match.away_team}
                                    </span>
                                </div>
                            </div>

                            {/* Informações Inferiores (Data e Status) */}
                            <div className="absolute bottom-3 flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                    <Calendar className="h-3 w-3 opacity-70" />
                                    <span>
                                        {match.championship_id === '2ecad449-e20f-4084-8ae6-c017083db04a'
                                            ? '2012'
                                            : match.championship_id === 'f5a811ac-82d4-49da-891d-d1118ce88ff8'
                                                ? '2018'
                                                : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(match.date))}
                                    </span>
                                </div>
                                <Badge variant={match.status === 'live' ? 'destructive' : match.status === 'finished' ? 'secondary' : 'outline'} className="text-[9px] h-4 px-2 shadow-none border-0 bg-secondary/50 text-secondary-foreground uppercase tracking-wider">
                                    {match.status === 'scheduled' ? 'Agendado' : match.status === 'live' ? '• Ao Vivo' : 'Encerrado'}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </TooltipProvider>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="h-8 w-20 text-xs"
                    >
                        Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Logic to show pages around current page
                            let p = i + 1;
                            if (totalPages > 5) {
                                if (currentPage <= 3) p = i + 1;
                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                                else p = currentPage - 2 + i;
                            }

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
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="h-8 w-20 text-xs"
                    >
                        Próxima
                    </Button>
                </div>
            )}
        </div>
    );
}
