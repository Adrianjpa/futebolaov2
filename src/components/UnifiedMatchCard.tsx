"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { format, isToday, isTomorrow, isYesterday, differenceInMinutes, differenceInHours, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronUp, CheckCircle2, Edit, Loader2, Trophy, Users, Clock, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Countdown } from "@/components/ui/countdown";
import { getFlagUrl, cn, formatMatchDate } from "@/lib/utils";

const TEAM_ISO_MAP: Record<string, string> = {
    'Polônia': 'pl', 'Grécia': 'gr', 'Rússia': 'ru', 'República Tcheca': 'cz',
    'Holanda': 'nl', 'Dinamarca': 'dk', 'Alemanha': 'de', 'Portugal': 'pt',
    'Espanha': 'es', 'Itália': 'it', 'Irlanda': 'ie', 'Croácia': 'hr',
    'França': 'fr', 'Inglaterra': 'gb-eng', 'Ucrânia': 'ua', 'Suécia': 'se'
};

interface UnifiedMatchCardProps {
    match: any;
    showChampionshipName?: boolean;
    live?: boolean;
    finished?: boolean;
    showBetButton?: boolean;
    hasPrediction?: boolean;
    isAdmin?: boolean;
    onUpdate?: () => void;
    users?: any[];
    teamMode?: 'clubes' | 'selecoes' | 'mista';
}

export function UnifiedMatchCard({
    match,
    showChampionshipName = false,
    live,
    finished,
    showBetButton = false,
    hasPrediction,
    isAdmin,
    onUpdate,
    users = [],
    teamMode = 'clubes'
}: UnifiedMatchCardProps) {
    const { user, profile } = useAuth();
    const supabase = createClient();
    const matchDate = parseISO(match.date);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDate, now);

    const isLive = live ?? (match.status === 'live');
    const isFinished = finished ?? (match.status === 'finished');

    // Default Lock: Time passed OR Game Live/Finished
    const isLocked = now >= matchDate || isLive || isFinished;
    const canEdit = isAdmin && isLive;
    // O cronômetro aparece se faltar menos de 60 minutos OU se já passou do horário mas não está AO VIVO/FINALIZADO
    const showCountdown = !isLive && !isFinished && minutesToStart <= 60;

    // States
    const [isEditing, setIsEditing] = useState(false);
    const [homeScore, setHomeScore] = useState(match.score_home?.toString() || match.homeScore?.toString() || "0");
    const [awayScore, setAwayScore] = useState(match.score_away?.toString() || match.awayScore?.toString() || "0");
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loadingPreds, setLoadingPreds] = useState(false);
    const [participantsData, setParticipantsData] = useState<any[]>([]); // New state for selections
    const [enablePriority, setEnablePriority] = useState<boolean>(true);
    const [officialRanking, setOfficialRanking] = useState<string[]>([]);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

    // Pred state for betting
    const [betHome, setBetHome] = useState<string>("");
    const [betAway, setBetAway] = useState<string>("");
    const [justSaved, setJustSaved] = useState(false);

    // Effect to load user's prediction into inputs
    useEffect(() => {
        const fetchUserPrediction = async () => {
            if (!user || !showBetButton) return;
            const { data, error } = await supabase
                .from("predictions")
                .select("home_score, away_score")
                .eq("match_id", match.id)
                .eq("user_id", user.id)
                .maybeSingle();

            if (data) {
                const pred = data as any;
                setBetHome(pred.home_score.toString());
                setBetAway(pred.away_score.toString());
            }
        };
        fetchUserPrediction();
    }, [user, match.id, showBetButton, supabase]);

    // --- HIGHLANDER LOGIC (Strict Priority) ---
    // Calculates the "Highlander" winners: Find the highest ranking team that was selected,
    // then find the highest priority (lowest index) used for that team, and select ONLY those users.
    const highlanderStats = useMemo(() => {
        // Validation: Must have ranking and participants
        const ranking = officialRanking || [];
        if (!ranking.length || (!participantsData || participantsData.length === 0)) return null;

        let winningTeam: string | null = null;
        let winningPriorityIdx: number = 999;
        let winnersSet = new Set<string>();

        // 1. Iterate official ranking sequentially (1st -> 2nd -> ...)
        for (const adminTeam of ranking) {
            if (!adminTeam) continue;

            // Find ALL users who selected this team (regardless of which slot)
            const usersWithTeam = participantsData.filter(p => (p.teamSelections || []).includes(adminTeam));

            if (usersWithTeam.length > 0) {
                // FOUND THE BEST TEAM WITH BETS.
                // According to rules ("Espanha ta na posição 1... se ninguem... ve o 2 lugar"),
                // we stop at the first team that has any bets.
                winningTeam = adminTeam;

                // 2. Find the BEST priority used (Lowest Index = Best Priority)
                let bestPriority = 999;
                usersWithTeam.forEach(u => {
                    const idx = u.teamSelections.indexOf(adminTeam);
                    if (idx !== -1 && idx < bestPriority) bestPriority = idx;
                });
                winningPriorityIdx = bestPriority;

                // 3. Collect winners who matched this best priority
                usersWithTeam.forEach(u => {
                    if (u.teamSelections.indexOf(adminTeam) === bestPriority) {
                        winnersSet.add(u.userId);
                    }
                });

                // STOP. Winners defined.
                break;
            }
        }
        return { winningTeam, winningPriorityIdx, winnersSet };
    }, [officialRanking, participantsData]);

    const handleSaveScore = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSaving(true);
        try {
            const { error } = await (supabase.from("matches") as any)
                .update({
                    score_home: parseInt(homeScore),
                    score_away: parseInt(awayScore)
                })
                .eq("id", match.id);

            if (error) throw error;
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error updating score:", error);
            alert("Erro ao atualizar placar.");
        } finally {
            setSaving(false);
        }
    };

    const handleAutoLive = async () => {
        try {
            const { error } = await (supabase.from("matches") as any)
                .update({ status: "live", score_home: 0, score_away: 0 })
                .eq("id", match.id);
            if (!error && onUpdate) onUpdate();
        } catch (e) {
            console.error("Error auto-starting match:", e);
        }
    };

    const handleFinishMatch = async () => {
        setSaving(true);
        try {
            const { error } = await (supabase.from("matches") as any)
                .update({
                    status: "finished",
                    score_home: parseInt(homeScore),
                    score_away: parseInt(awayScore)
                })
                .eq("id", match.id);

            if (error) throw error;
            alert("Partida finalizada! Os pontos serão calculados pela View de Ranking.");
            setShowFinalizeDialog(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error finishing match:", error);
            alert("Erro ao finalizar partida.");
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrediction = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || isLocked) return;
        setSaving(true);
        try {
            const { error } = await (supabase.from("predictions") as any).upsert({
                user_id: user.id,
                match_id: match.id,
                home_score: parseInt(betHome),
                away_score: parseInt(betAway)
            }, { onConflict: 'user_id,match_id' });

            if (error) throw error;
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000);
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error("Error saving prediction:", error);
            const msg = error.message || error.details || JSON.stringify(error);
            alert("Erro ao salvar palpite: " + msg);
        } finally {
            setSaving(false);
        }
    };

    const canViewPredictions = isAdmin || isLive || isFinished;

    const handleToggleExpand = async () => {
        if (!canViewPredictions && !isAdmin) return;

        if (!expanded) {
            setLoadingPreds(true);
            try {
                // 1. Fetch Predictions
                if (predictions.length === 0) {
                    const { data: preds } = await supabase
                        .from("predictions")
                        .select("*")
                        .eq("match_id", match.id)
                        .order('points', { ascending: false });
                    setPredictions(preds || []);
                }

                // 2. Fetch Championship Data (Ranking & Participants)
                const champId = match.championship_id || match.championshipId;
                if (champId) {
                    const { data: champ } = await supabase
                        .from("championships")
                        .select("settings")
                        .eq("id", champId)
                        .single();

                    if (champ) {
                        const settings = (champ as any).settings || {};
                        const ranking = settings.officialRanking || [];
                        setOfficialRanking(ranking);
                        // Force boolean conversion and default to TRUE for Euro legacy
                        setEnablePriority(settings.enableSelectionPriority !== false);

                        // 3. Fetch Participants Selections with Fallback
                        let finalParticipants: any[] = [];

                        // Try new table
                        const { data: newParts } = await supabase
                            .from("championship_participants")
                            .select("user_id, team_selections")
                            .eq("championship_id", champId);

                        if (newParts && newParts.length > 0) {
                            // Map table structure to local structure
                            finalParticipants = newParts.map((p: any) => ({
                                userId: p.user_id,
                                teamSelections: p.team_selections || [],
                                nickname: p.nickname || "Usuário" // We might need to fetch profile names if not in this table, but usually we map by ID later
                            }));
                        } else {
                            // Fallback to Settings (Legacy JSON)
                            const legacyParts = settings.participants || [];
                            finalParticipants = legacyParts.map((p: any) => ({
                                userId: p.userId || p.id || p.user_id,
                                nickname: p.nickname || p.displayName || p.nome,
                                teamSelections: p.teamSelections || p.team_selections || p.selections || []
                            }));
                        }

                        setParticipantsData(finalParticipants);
                    }
                }
            } catch (e) {
                console.error("Error in UnifiedMatchCard expand:", e);
            } finally {
                setLoadingPreds(false);
            }
        }
        setExpanded(!expanded);
    };

    const StatusBadgeComponent = () => {
        if (isLive) return (
            <span className="text-[10px] sm:text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-red-500/20 animate-pulse tracking-wider">
                AO VIVO
            </span>
        );
        if (isFinished) return (
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-muted dark:bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-border dark:border-slate-700 uppercase tracking-wider">
                FINAL
            </span>
        );
        return null;
    };

    return (
        <TooltipProvider delayDuration={0}>
            <Card
                className={cn(
                    "group relative overflow-hidden transition-all duration-300 border border-border dark:border-slate-800 bg-card dark:bg-slate-950/50 shadow-lg",
                    canViewPredictions ? "hover:bg-muted/50 dark:hover:bg-slate-900/80 cursor-pointer" : "cursor-default"
                )}
                onClick={handleToggleExpand}
            >
                <CardContent className="p-3 sm:p-6 relative min-h-[160px] flex flex-col justify-center">
                    {/* 1. TOP INFO BAR (Responsive) */}
                    <div className="flex items-center justify-between w-full mb-2 sm:mb-6 relative px-1 sm:px-2">
                        {/* LEFT: Trophy Icon/Championship Logo (Mobile) or Round (Desktop) */}
                        <div className="flex-1 flex justify-start items-center">
                            <div className="md:hidden flex items-center">
                                {(match.championshipLogoUrl || match.championship_logo) ? (
                                    <img src={match.championshipLogoUrl || match.championship_logo} className="h-5 w-5 object-contain" alt="champ" />
                                ) : (
                                    <Trophy className="h-5 w-5 text-blue-500" />
                                )}
                            </div>
                            <span className="hidden md:block text-[11px] font-bold text-muted-foreground bg-muted dark:bg-slate-800/40 px-2.5 py-1 rounded-md border border-border dark:border-slate-700/50 uppercase">
                                {match.round_name || (match.round ? `Rodada ${match.round}` : "Rodada --")}
                            </span>
                        </div>

                        {/* CENTER: Championship Name (Desktop Only) */}
                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <Popover>
                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="outline-none group/champ">
                                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-[0.25em] text-center whitespace-nowrap">
                                            {match.championshipName || "PREMIER LEAGUE 25/26"}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="top" className="w-auto p-2 bg-popover border-border dark:bg-slate-900 dark:border-slate-800 text-popover-foreground dark:text-white text-xs font-bold pointer-events-none">
                                    {match.championshipName || "Campeonato"}
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* RIGHT: Status Badge */}
                        <div className="flex-1 flex justify-end">
                            <StatusBadgeComponent />
                        </div>
                    </div>

                    {/* 2. MOBILE ONLY: Round (Centered) */}
                    <div className="md:hidden flex justify-center mb-4">
                        <span className="text-[11px] font-bold text-muted-foreground/80 dark:text-slate-400/80 uppercase">
                            {match.round_name || (match.round ? `Rodada ${match.round}` : "Rodada --")}
                        </span>
                    </div>

                    {/* 3. MAIN TEAMS AREA */}
                    <div className="relative flex flex-col items-center">
                        <div className={`flex items-center justify-center w-full max-w-5xl mb-4 ${isLive || isFinished ? 'gap-4 sm:gap-12' : 'gap-12 sm:gap-24'}`}>
                            {/* Home Team */}
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                <span className="hidden md:block font-bold text-base lg:text-[19px] text-foreground dark:text-slate-100 truncate text-right">
                                    {match.home_team || match.homeTeamName}
                                </span>
                                <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className={cn(
                                            "h-12 w-12 sm:h-14 sm:w-14 transition-transform hover:scale-110 flex items-center justify-center shrink-0 outline-none overflow-hidden",
                                            teamMode === 'selecoes' ? "rounded-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" : "rounded-lg"
                                        )}>
                                            <img
                                                src={match.home_team_crest || getFlagUrl(match.home_team || match.homeTeamName)}
                                                alt=""
                                                className={cn(
                                                    "drop-shadow-sm",
                                                    teamMode === 'selecoes' ? "w-full h-full object-cover rounded-full" : "max-h-full max-w-full object-contain"
                                                )}
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="bottom" className="w-auto p-2 bg-popover border-border dark:bg-slate-900 dark:border-slate-800 text-popover-foreground dark:text-white text-xs font-bold md:hidden pointer-events-none">
                                        {match.home_team || match.homeTeamName}
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Score/VS Section */}
                            <div className="z-10 shrink-0">
                                {isEditing ? (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Input
                                            type="number"
                                            value={homeScore}
                                            onChange={(e) => setHomeScore(e.target.value)}
                                            className="w-16 h-12 text-center text-xl font-bold bg-background border-input"
                                        />
                                        <Input
                                            type="number"
                                            value={awayScore}
                                            onChange={(e) => setAwayScore(e.target.value)}
                                            className="w-16 h-12 text-center text-xl font-bold bg-background border-input"
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleSaveScore} disabled={saving} className="h-8 w-8 text-green-600 dark:text-green-500">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                ) : showBetButton && !isLocked ? (
                                    <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={betHome}
                                                onChange={(e) => setBetHome(e.target.value)}
                                                className="w-16 h-12 text-center text-xl font-bold bg-background/50 border-primary/20 focus:border-primary"
                                                placeholder="-"
                                            />
                                            <span className="text-muted-foreground font-bold">X</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={betAway}
                                                onChange={(e) => setBetAway(e.target.value)}
                                                className="w-16 h-12 text-center text-xl font-bold bg-background/50 border-primary/20 focus:border-primary"
                                                placeholder="-"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className={cn(
                                                "h-7 text-[10px] font-bold px-4 rounded-full transition-all duration-300",
                                                justSaved ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                                            )}
                                            onClick={handleSavePrediction}
                                            disabled={saving || betHome === "" || betAway === ""}
                                        >
                                            {saving ? (
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                            ) : justSaved ? (
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                            ) : (
                                                <Save className="h-3 w-3 mr-1" />
                                            )}
                                            {justSaved ? "SALVO!" : "SALVAR"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        {isLive || isFinished ? (
                                            <div className="bg-slate-100/80 dark:bg-black px-5 py-2 sm:px-8 sm:py-3 rounded-2xl md:rounded-full border border-slate-200 dark:border-slate-800 flex items-center gap-4 sm:gap-8 min-w-[100px] sm:min-w-[140px] justify-center shadow-2xl backdrop-blur-sm">
                                                <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-mono break-keep">{match.score_home ?? 0}</span>
                                                <span className="text-slate-400 dark:text-slate-600 font-bold text-xl">-</span>
                                                <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-mono break-keep">{match.score_away ?? 0}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl sm:text-3xl font-black text-slate-300 dark:text-slate-700/60 uppercase tracking-tighter">vs</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                                <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className={cn(
                                            "h-12 w-12 sm:h-14 sm:w-14 transition-transform hover:scale-110 flex items-center justify-center shrink-0 outline-none overflow-hidden rounded-lg",
                                            teamMode === 'selecoes' ? "rounded-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" : "rounded-lg"
                                        )}>
                                            <img
                                                src={match.away_team_crest || getFlagUrl(match.away_team || match.awayTeamName)}
                                                alt=""
                                                className={cn(
                                                    "drop-shadow-sm",
                                                    teamMode === 'selecoes' ? "w-full h-full object-cover rounded-full" : "max-h-full max-w-full object-contain"
                                                )}
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="bottom" className="w-auto p-2 bg-popover border-border dark:bg-slate-900 dark:border-slate-800 text-popover-foreground dark:text-white text-xs font-bold md:hidden pointer-events-none">
                                        {match.away_team || match.awayTeamName}
                                    </PopoverContent>
                                </Popover>
                                <span className="hidden md:block font-bold text-base lg:text-[19px] text-foreground dark:text-slate-100 truncate text-left">
                                    {match.away_team || match.awayTeamName}
                                </span>
                            </div>
                        </div>

                        {/* Date / Time / Admin Actions */}
                        <div className="flex items-center justify-center gap-2 text-muted-foreground font-semibold mb-2 h-7 sm:h-8">
                            {isLive ? (
                                isAdmin && !isEditing && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold border-red-600/30 text-red-600 dark:text-red-500 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 transition-all px-4 rounded-full shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); setShowFinalizeDialog(true); }}
                                    >
                                        FINALIZAR PARTIDA
                                    </Button>
                                )
                            ) : showCountdown ? (
                                <div className="flex items-center gap-1.5 bg-red-500/5 dark:bg-red-500/10 px-3 py-1 rounded-full border border-red-500/10 animate-pulse">
                                    <Clock className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-[11px] sm:text-[13px] text-red-600 dark:text-red-500 font-bold uppercase tracking-wider">
                                        {minutesToStart > 0 && "Começa em "}
                                        <Countdown targetDate={matchDate} onZero={handleAutoLive} />
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                                    <span className="text-[11px] sm:text-[13px] font-bold">
                                        {formatMatchDate(match.date, match.championship_id)}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Footer indicator */}
                        {canViewPredictions && (
                            <div className="opacity-10 group-hover:opacity-40 transition-opacity">
                                <ChevronDown className={`h-4 w-4 transition-transform duration-300 text-foreground ${expanded ? 'rotate-180' : ''}`} />
                            </div>
                        )}

                        {canEdit && !isEditing && (
                            <div className="absolute top-2 right-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>

                {/* PREDICTIONS SECTION */}
                {expanded && (
                    <div className="border-t border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-950 animate-in slide-in-from-top-4 duration-300">
                        <div className="p-4 sm:p-6 space-y-4">

                            {/* Header Section */}
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Palpites da Galera</h4>
                                <span className="px-2 py-0.5 rounded-full bg-muted dark:bg-slate-800 text-[10px] font-bold text-muted-foreground border border-border">
                                    {predictions.length} palpites
                                </span>
                            </div>

                            {loadingPreds ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : predictions.length > 0 ? (
                                <div className="space-y-2">
                                    {predictions.map((pred) => {
                                        const userProfile = users.find(u => u.id === pred.user_id);
                                        const isComputed = isLive || isFinished;
                                        const points = pred.points || 0;
                                        const isZero = isComputed && points === 0;
                                        const isExact = isComputed && !isLive && (pred.home_score === match.score_home && pred.away_score === match.score_away);

                                        // TODO: Implementar lógica de fichas/combo/bonus
                                        const isGoalsOnly = false; // Roxo (Placeholder)
                                        const isCombo = false; // Dourado (Placeholder)
                                        const isBonus = false; // Prata (Placeholder)

                                        let bgClass = "";
                                        let badgeClass = "";

                                        if (!isComputed) {
                                            bgClass = "bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/60";
                                            badgeClass = "hidden"; // Esconde o badge de pontos para jogos futuros
                                        } else if (isCombo) {
                                            bgClass = "bg-yellow-900/60 border-yellow-600/60 hover:bg-yellow-800/60";
                                            badgeClass = "bg-yellow-500 text-black font-bold";
                                        } else if (isBonus) {
                                            bgClass = "bg-slate-700/60 border-slate-500/60 hover:bg-slate-600/60";
                                            badgeClass = "bg-slate-200 text-black font-bold";
                                        } else if (isZero) {
                                            bgClass = "bg-red-950/60 border-red-800/60 hover:bg-red-900/50";
                                            badgeClass = "bg-red-600 text-white font-bold";
                                        } else if (isExact) {
                                            bgClass = "bg-emerald-950/60 border-emerald-600/60 hover:bg-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                                            badgeClass = "bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 ring-1 ring-emerald-400/50 scale-110";
                                        } else if (isGoalsOnly) {
                                            bgClass = "bg-purple-900/50 border-purple-600/50 hover:bg-purple-800/50";
                                            badgeClass = "bg-purple-500 text-white font-bold";
                                        } else {
                                            bgClass = "bg-blue-950/50 border-blue-800/50 hover:bg-blue-900/50";
                                            badgeClass = "bg-blue-600 text-white font-bold";
                                        }

                                        return (
                                            <div key={pred.id} className={`grid grid-cols-[1fr_auto_1fr] sm:grid-cols-3 items-center gap-2 p-3 rounded-xl border transition-all duration-300 ${bgClass}`}>
                                                {/* Left: Avatar + Name */}
                                                <div className="flex items-center gap-3 min-w-0 overflow-hidden text-left">
                                                    <Avatar
                                                        className="h-8 w-8 border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.location.href = `/dashboard/profile/${pred.user_id}`;
                                                        }}
                                                    >
                                                        <AvatarImage src={userProfile?.foto_perfil} />
                                                        <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                                                            {(userProfile?.nickname || userProfile?.nome || "?").substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0 leading-none">
                                                        <Link
                                                            href={`/dashboard/profile/${pred.user_id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-sm font-bold text-slate-200 truncate mb-0.5 hover:text-blue-400 transition-colors"
                                                        >
                                                            {userProfile?.nickname || userProfile?.nome || "User"}
                                                        </Link>
                                                        {(() => {
                                                            const p = participantsData.find(pd =>
                                                                pd.userId === pred.user_id ||
                                                                (userProfile?.nickname && pd.nickname === userProfile.nickname) ||
                                                                (userProfile?.nome && pd.nickname === userProfile.nome)
                                                            );
                                                            if (p?.teamSelections?.length > 0) {
                                                                return (
                                                                    <div className="flex items-center min-h-[14px]" onClick={(e) => e.stopPropagation()}>
                                                                        {/* MOBILE: TROPHY (Using Popover for better touch support) */}
                                                                        <div className="md:hidden">
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-5 w-5 p-0 hover:bg-transparent"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent
                                                                                    className="bg-slate-900 border-slate-700 p-3 shadow-xl w-48"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <div className="space-y-1.5">
                                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-1 mb-2">Seleções Favoritas</p>
                                                                                        {(() => {
                                                                                            const isRankingReady = officialRanking.some(r => r && r !== "");
                                                                                            if (!isRankingReady) {
                                                                                                return p.teamSelections.map((team: string, idx: number) => (
                                                                                                    <div key={idx} className="flex items-center gap-2">
                                                                                                        <span className="text-[10px] font-mono text-muted-foreground w-4">{idx + 1}º</span>
                                                                                                        <span className="text-xs font-bold text-slate-100">{team}</span>
                                                                                                    </div>
                                                                                                ));
                                                                                            }

                                                                                            return p.teamSelections.map((team: string, idx: number) => {
                                                                                                const teamRank = officialRanking.indexOf(team);
                                                                                                const isHit = teamRank !== -1;

                                                                                                // USE CENTRALIZED HIGHLANDER STATS
                                                                                                const isAbsoluteWinner = enablePriority
                                                                                                    ? (highlanderStats?.winnersSet.has(p.userId) && team === highlanderStats.winningTeam && idx === highlanderStats.winningPriorityIdx)
                                                                                                    : isHit;

                                                                                                let opacityClass = "opacity-40 grayscale";
                                                                                                let textClass = "text-muted-foreground";
                                                                                                let statusBadge = null;

                                                                                                if (isAbsoluteWinner) {
                                                                                                    opacityClass = "opacity-100 grayscale-0";
                                                                                                    textClass = enablePriority ? "text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-emerald-400 font-bold";
                                                                                                    statusBadge = enablePriority ? (
                                                                                                        <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded ml-auto flex items-center gap-1 animate-pulse">
                                                                                                            <Trophy className="h-2 w-2" /> LÍDER
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded ml-auto">ACERTOU</span>
                                                                                                    );
                                                                                                } else if (!enablePriority && isHit) {
                                                                                                    opacityClass = "opacity-100 grayscale-0";
                                                                                                    textClass = "text-emerald-400 font-bold";
                                                                                                    statusBadge = <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded ml-auto">ACERTOU</span>;
                                                                                                }

                                                                                                return (
                                                                                                    <div key={idx} className={`flex items-center gap-2 transition-all duration-300 ${opacityClass}`}>
                                                                                                        <span className="text-[10px] font-mono text-muted-foreground w-4">{idx + 1}º</span>
                                                                                                        <span className={`text-xs ${textClass}`}>{team}</span>
                                                                                                        {statusBadge}
                                                                                                    </div>
                                                                                                );
                                                                                            });
                                                                                        })()}
                                                                                    </div>
                                                                                </PopoverContent>
                                                                            </Popover>
                                                                        </div>

                                                                        {/* DESKTOP: FLAGS SIDE BY SIDE */}
                                                                        <div className="hidden md:flex items-center gap-1">
                                                                            {(() => {
                                                                                const isRankingReady = officialRanking.some(r => r && r !== "");
                                                                                if (!isRankingReady) {
                                                                                    return p.teamSelections.map((team: string, idx: number) => {
                                                                                        const iso = TEAM_ISO_MAP[team] || 'xx';
                                                                                        return (
                                                                                            <Tooltip key={idx}>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <div className="relative group/flag transition-all duration-300">
                                                                                                        <img src={`https://flagcdn.com/w40/${iso}.png`} className="h-3 w-4.5 object-cover rounded-[2px] border border-white/5" />
                                                                                                    </div>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent className="text-[10px] uppercase font-bold">{idx + 1}º {team}</TooltipContent>
                                                                                            </Tooltip>
                                                                                        );
                                                                                    });
                                                                                }

                                                                                return p.teamSelections.map((team: string, idx: number) => {
                                                                                    const iso = TEAM_ISO_MAP[team] || 'xx';
                                                                                    const teamRank = officialRanking.indexOf(team);
                                                                                    const isHit = teamRank !== -1;

                                                                                    // USE CENTRALIZED HIGHLANDER STATS
                                                                                    const isAbsoluteWinner = enablePriority
                                                                                        ? (highlanderStats?.winnersSet.has(p.userId) && team === highlanderStats.winningTeam && idx === highlanderStats.winningPriorityIdx)
                                                                                        : isHit; // Fallback to simple hit if priority off

                                                                                    // Simple hit check for visual fallback
                                                                                    const isSimpleHit = !enablePriority && isHit;

                                                                                    return (
                                                                                        <Tooltip key={idx}>
                                                                                            <TooltipTrigger asChild>
                                                                                                <div className={`relative group/flag transition-all duration-500
                                                                                                    ${isAbsoluteWinner ? "opacity-100 scale-125 z-10 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" : "opacity-20 grayscale blur-[0.5px] scale-90"}
                                                                                                    ${isSimpleHit ? "opacity-100 grayscale-0 blur-0 scale-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] border-emerald-500/50" : ""}
                                                                                                `}>
                                                                                                    <img
                                                                                                        src={`https://flagcdn.com/w40/${iso}.png`}
                                                                                                        alt={team}
                                                                                                        className={`h-3 w-4.5 object-cover rounded-[2px] shadow-sm cursor-help border transition-all ${isAbsoluteWinner ? `border-yellow-400 border-2` : (isSimpleHit ? `border-emerald-400 border-2` : 'border-white/5')}`}
                                                                                                    />
                                                                                                    {isAbsoluteWinner && (
                                                                                                        <div className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-yellow-400 rounded-full border-2 border-slate-950 animate-bounce shadow-[0_0_8px_rgba(250,204,21,1)] flex items-center justify-center">
                                                                                                            <div className="h-1 w-1 bg-slate-950 rounded-full" />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent side="bottom" className={`text-[10px] font-bold px-2 py-1 ${!isAbsoluteWinner && !isSimpleHit ? "opacity-70" : ""}`}>
                                                                                                {idx + 1}º {team}
                                                                                                {isAbsoluteWinner && " (LÍDER ABSOLUTO! 🏆)"}
                                                                                                {isSimpleHit && " (Acertou! ✅)"}
                                                                                                {!isAbsoluteWinner && !isSimpleHit && enablePriority && isHit && " (Superado pela Hierarquia ❌)"}
                                                                                            </TooltipContent>
                                                                                        </Tooltip>
                                                                                    );
                                                                                });
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return <div className="h-[14px]" />; // Placeholder to keep height consistent
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Center: Score */}
                                                <div className="flex justify-center">
                                                    <div className="font-mono font-bold text-lg text-white tracking-widest bg-black/20 px-3 py-1 rounded-lg whitespace-nowrap">
                                                        {pred.home_score} - {pred.away_score}
                                                    </div>
                                                </div>

                                                {/* Right: Points Badge */}
                                                <div className="flex justify-end">
                                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0 ${badgeClass}`}>
                                                        {isZero ? "0" : `+${points}`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-muted bg-muted/10">
                                    <p className="text-xs text-muted-foreground">Ninguém palpitou ainda. Seja o primeiro!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Finalizar Partida</DialogTitle>
                        <DialogDescription>Confirma o placar final de {homeScore} x {awayScore}?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowFinalizeDialog(false)}>Cancelar</Button>
                        <Button onClick={handleFinishMatch} disabled={saving} className="bg-green-600 hover:bg-green-700">Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
