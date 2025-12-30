"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { format, isToday, isTomorrow, isYesterday, differenceInMinutes, differenceInHours, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronUp, CheckCircle2, Edit, Loader2, Trophy, Users, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Countdown } from "@/components/ui/countdown";
import { getFlagUrl } from "@/lib/utils";

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
    users = []
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
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

    // Pred state for betting
    const [betHome, setBetHome] = useState<string>("");
    const [betAway, setBetAway] = useState<string>("");

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
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error saving prediction:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleExpand = async () => {
        if (!expanded && predictions.length === 0) {
            setLoadingPreds(true);
            try {
                const { data } = await supabase
                    .from("predictions")
                    .select("*")
                    .eq("match_id", match.id);
                setPredictions(data || []);
            } catch (e) { console.error(e); } finally { setLoadingPreds(false); }
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
            <Card className="group relative overflow-hidden transition-all duration-300 border border-border dark:border-slate-800 bg-card dark:bg-slate-950/50 hover:bg-muted/50 dark:hover:bg-slate-900/80 cursor-pointer shadow-lg" onClick={handleToggleExpand}>
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
                            <span className="hidden md:block text-[11px] font-bold text-muted-foreground bg-muted dark:bg-slate-800/40 px-2.5 py-1 rounded-md border border-border dark:border-slate-700/50">
                                {match.round ? `Rodada ${match.round}` : "Rodada --"}
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
                        <span className="text-[11px] font-bold text-muted-foreground/80 dark:text-slate-400/80">
                            {match.round ? `Rodada ${match.round}` : "Rodada --"}
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
                                        <button className="h-12 w-12 sm:h-14 sm:w-14 transition-transform hover:scale-110 flex items-center justify-center shrink-0 outline-none">
                                            <img
                                                src={match.home_team_crest || getFlagUrl(match.home_team || match.homeTeamName)}
                                                alt=""
                                                className="max-h-full max-w-full object-contain filter drop-shadow-md"
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
                                            className="w-12 h-10 text-center font-bold bg-background border-input"
                                        />
                                        <Input
                                            type="number"
                                            value={awayScore}
                                            onChange={(e) => setAwayScore(e.target.value)}
                                            className="w-12 h-10 text-center font-bold bg-background border-input"
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleSaveScore} disabled={saving} className="h-8 w-8 text-green-600 dark:text-green-500">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
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
                                        <button className="h-12 w-12 sm:h-14 sm:w-14 transition-transform hover:scale-110 flex items-center justify-center shrink-0 outline-none">
                                            <img
                                                src={match.away_team_crest || getFlagUrl(match.away_team || match.awayTeamName)}
                                                alt=""
                                                className="max-h-full max-w-full object-contain filter drop-shadow-md"
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
                                    <span className="text-[11px] sm:text-[13px]">
                                        {isToday(matchDate) ? "Hoje" : isTomorrow(matchDate) ? "Amanhã" : isYesterday(matchDate) ? "Ontem" : format(matchDate, "dd/MM", { locale: ptBR })}
                                        {" • "}
                                        {format(matchDate, "HH:mm")}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Footer indicator */}
                        <div className="opacity-10 group-hover:opacity-40 transition-opacity">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 text-foreground ${expanded ? 'rotate-180' : ''}`} />
                        </div>

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
                    <div className="border-t border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-900/30 animate-in slide-in-from-top-4 duration-300">
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Status for betting */}
                            {!isLocked && showBetButton && (
                                <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 flex items-center justify-center gap-2">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                className="w-16 h-12 text-center text-xl font-bold rounded-xl bg-background border-input"
                                                value={betHome}
                                                onChange={(e) => setBetHome(e.target.value)}
                                            />
                                            <span className="font-bold text-muted-foreground">x</span>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                className="w-16 h-12 text-center text-xl font-bold rounded-xl bg-background border-input"
                                                value={betAway}
                                                onChange={(e) => setBetAway(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            onClick={handleSavePrediction}
                                            disabled={saving || !betHome || !betAway}
                                            className="h-12 px-8 rounded-xl font-bold"
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Palpitar"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <h4 className="text-sm font-bold text-foreground">Palpites da Galera</h4>
                            </div>

                            {loadingPreds ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : predictions.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {predictions.map((pred) => {
                                        const userProfile = users.find(u => u.id === pred.user_id);
                                        return (
                                            <div key={pred.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-slate-800/40 border border-border dark:border-slate-700/50">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7 border border-border">
                                                        <AvatarImage src={userProfile?.foto_perfil} />
                                                        <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                                                            {(userProfile?.nickname || userProfile?.nome || "?").substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
                                                        {userProfile?.nickname || userProfile?.nome || "User"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-background dark:bg-slate-900 rounded-lg text-xs font-mono font-bold text-foreground dark:text-white border border-border dark:border-slate-700/50">
                                                    <span>{pred.home_score}</span>
                                                    <span className="text-muted-foreground">x</span>
                                                    <span>{pred.away_score}</span>
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
