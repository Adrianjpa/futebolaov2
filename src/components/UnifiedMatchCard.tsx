"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { format, isToday, isTomorrow, isYesterday, differenceInMinutes, differenceInHours, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronUp, CheckCircle2, Edit, Loader2, Trophy, Users, Clock, Save, UserX, AlertTriangle, Star, History, Gem, Ghost } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Countdown } from "@/components/ui/countdown";
import { getFlagUrl, cn, formatMatchDate, translateRoundName } from "@/lib/utils";

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
    comboEnabled?: boolean;
    availableComboTokens?: number;
    totalPhaseTokens?: number;
    isFutureBlock?: boolean;
    targetUserId?: string;
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
    teamMode = 'clubes',
    comboEnabled = false,
    availableComboTokens = 0,
    totalPhaseTokens = 0,
    isFutureBlock = false,
    targetUserId
}: UnifiedMatchCardProps) {
    const { user, profile } = useAuth();
    const effectiveUserId = targetUserId || user?.id;
    const supabase = createClient();
    const matchDate = parseISO(match.date);
    const now = new Date();
    const minutesToStart = differenceInMinutes(matchDate, now);

    const isLive = live ?? (match.status === 'live');
    const isFinished = finished ?? (match.status === 'finished');

    // --- URGENCY LOGIC (New) ---
    const isUrgent = !isAdmin && !hasPrediction && !isFinished && !isLive && minutesToStart > 0 && minutesToStart <= 120; // 2 hours
    const isCritical = !isAdmin && !hasPrediction && !isFinished && !isLive && minutesToStart > 0 && minutesToStart <= 30; // 30 mins

    const urgencyClass = isCritical
        ? "border-red-500/50 shadow-sm shadow-red-500/20 bg-red-500/5 animate-border-pulse"
        : isUrgent
            ? "border-yellow-500/50 shadow-sm shadow-yellow-500/20 bg-yellow-500/5"
            : "";
    // ---------------------------

    // Default Lock: Time passed OR Game Live/Finished
    const isLocked = now >= matchDate || isLive || isFinished;
    const canEdit = isAdmin && (isLive || isFinished);
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
    const [enableTiebreaker, setEnableTiebreaker] = useState<boolean>(false);
    const [officialRanking, setOfficialRanking] = useState<string[]>([]);
    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

    // Pred state for betting
    const [betHome, setBetHome] = useState<string>("");
    const [betAway, setBetAway] = useState<string>("");
    const [justSaved, setJustSaved] = useState(false);
    const [predictionCreatedAt, setPredictionCreatedAt] = useState<Date | null>(null);
    const [predictionUpdatedAt, setPredictionUpdatedAt] = useState<Date | null>(null);
    const [isComboActive, setIsComboActive] = useState<boolean>(false);
    const [initialComboActive, setInitialComboActive] = useState<boolean>(false);
    const [betTotalGoals, setBetTotalGoals] = useState<string>("");

    // --- LOIA PREDICTION FRONT-FACING ---
    const [loiaPrediction, setLoiaPrediction] = useState<{home: number, away: number} | null>(null);
    const [loiaUserId, setLoiaUserId] = useState<string | null>(null);

    // --- USER RESULT COLOR (Live & Finished) ---
    // Computes the border/background of the main card based on the target user's prediction outcome.
    const userResultClass = useMemo(() => {
        if (!effectiveUserId || (!isLive && !isFinished)) return "";
        if (betHome === "" || betAway === "") return "";
        if (match.score_home === null || match.score_home === undefined) return "";
        if (match.score_away === null || match.score_away === undefined) return "";

        const ph = parseInt(betHome, 10);
        const pa = parseInt(betAway, 10);
        const mh = match.score_home as number;
        const ma = match.score_away as number;

        if (isNaN(ph) || isNaN(pa)) return "";

        const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
        const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);
        const isExact = ph === mh && pa === ma;
        const comboHit = isComboActive && betTotalGoals !== "" && parseInt(betTotalGoals, 10) === (mh + ma);

        if (isExact && comboHit)
            return "bg-yellow-500 text-white dark:bg-yellow-900/40 border-yellow-600 dark:border-yellow-600/40 shadow-md dark:text-foreground";
        if (isExact)
            return "bg-emerald-600 text-white dark:bg-emerald-950/60 border-emerald-700 dark:border-emerald-600/60 shadow-md dark:text-foreground";
        if (!isExact && comboHit)
            return "bg-slate-500 text-white dark:bg-slate-700/60 border-slate-600 dark:border-slate-400/50 shadow-md dark:text-foreground";
        if (winP === winM)
            return "bg-blue-600 text-white dark:bg-blue-950/50 border-blue-700 dark:border-blue-800/50 shadow-md dark:text-foreground";
        return "bg-red-600 text-white dark:bg-red-950/60 border-red-700 dark:border-red-800/60 shadow-md dark:text-foreground";
    }, [effectiveUserId, isLive, isFinished, betHome, betAway, isComboActive, betTotalGoals, match.score_home, match.score_away]);
    // -------------------------------------------
    const isColored = !!userResultClass;

    // Effect to load user's prediction into inputs
    // Runs when showBetButton=true (betting mode) OR when the match is live/finished (to compute card color)
    useEffect(() => {
        const fetchUserPrediction = async () => {
            if (!effectiveUserId) return;
            // Fetch if betting mode OR if game is live/finished (for card color display)
            if (!showBetButton && !isLive && !isFinished) return;
            const { data } = await supabase
                .from("predictions")
                .select("home_score, away_score, updated_at, created_at, is_combo, combo_total_goals")
                .eq("match_id", match.id)
                .eq("user_id", effectiveUserId)
                .maybeSingle();

            if (data) {
                const pred = data as any;
                
                // For live/finished matches, fetch true timestamp via API to bypass RLS
                if (isLive || isFinished) {
                    try {
                        const res = await fetch(`/api/predictions/timestamp?matchId=${match.id}&userId=${effectiveUserId}`);
                        if (res.ok) {
                            const { timestamp } = await res.json();
                            if (timestamp) {
                                pred.updated_at = timestamp;
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching true timestamp:", e);
                    }
                }

                setBetHome(pred.home_score.toString());
                setBetAway(pred.away_score.toString());
                setIsComboActive(pred.is_combo || false);
                setInitialComboActive(pred.is_combo || false);
                if (pred.combo_total_goals !== null && pred.combo_total_goals !== undefined) {
                    setBetTotalGoals(pred.combo_total_goals.toString());
                }

                if (pred.created_at) {
                    setPredictionCreatedAt(new Date(pred.created_at));
                }

                if (pred.updated_at) {
                    setPredictionUpdatedAt(new Date(pred.updated_at));
                } else {
                    setPredictionUpdatedAt(null);
                }
            }
        };
        fetchUserPrediction();
    }, [effectiveUserId, match.id, showBetButton, isLive, isFinished, supabase]);

    // Fetch Loia's prediction for the card face if game hasn't started (Only needed for normal users, but we fetch it to be safe)
    useEffect(() => {
        if (!isLive && !isFinished && !isAdmin) {
            const fetchLoia = async () => {
                const champId = match.championship_id || match.championshipId;
                if (!champId) return;

                const { data: champ } = await supabase
                    .from("championships")
                    .select("settings")
                    .eq("id", champId)
                    .single();

                const participants = (champ as any)?.settings?.participants || [];
                const loiaParticipant = participants.find((p: any) => p.email === "lindoaldo@legacy.local");
                const loiaId = loiaParticipant?.userId || loiaParticipant?.id || loiaParticipant?.user_id;
                
                if (loiaId && (champ as any)?.settings?.enableLoia) {
                    setLoiaUserId(loiaId);
                    const { data: pred } = await supabase
                        .from("predictions")
                        .select("home_score, away_score")
                        .eq("match_id", match.id)
                        .eq("user_id", loiaId)
                        .maybeSingle();
                    if (pred) {
                        setLoiaPrediction({ home: (pred as any).home_score, away: (pred as any).away_score });
                    }
                }
            };
            fetchLoia();
        }
    }, [match.id, match.championship_id, match.championshipId, isLive, isFinished, isAdmin, supabase]);

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

        let currentCandidates = participantsData;

        // 1. Iterate official ranking sequentially (1st -> 2nd -> ...)
        for (let i = 0; i < ranking.length; i++) {
            const adminTeam = ranking[i];
            if (!adminTeam) continue;

            // Find ALL candidates who selected this team (regardless of which slot)
            const usersWithTeam = currentCandidates.filter(p => (p.teamSelections || []).includes(adminTeam));

            if (usersWithTeam.length > 0) {
                // Record the exact top overall team for visual styling if it's the 1st match
                if (!winningTeam) winningTeam = adminTeam;

                // 2. Find the BEST priority used (Lowest Index = Best)
                let bestPriority = 999;
                usersWithTeam.forEach(u => {
                    const idx = u.teamSelections.indexOf(adminTeam);
                    if (idx !== -1 && idx < bestPriority) bestPriority = idx;
                });
                
                if (winningPriorityIdx === 999) winningPriorityIdx = bestPriority;

                // 3. Filter candidates down to those who got this best priority
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

        return { winningTeam, winningPriorityIdx, winnersSet };
    }, [officialRanking, participantsData, enableTiebreaker]);

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
            const nowIso = new Date().toISOString();
            const isUpdate = !!predictionCreatedAt; // If we have a creation date, it's an update

            const payload: any = {
                user_id: user.id,
                match_id: match.id,
                home_score: parseInt(betHome),
                away_score: parseInt(betAway),
                is_combo: isComboActive,
                combo_total_goals: isComboActive && betTotalGoals !== "" ? parseInt(betTotalGoals) : null
            };

            // Only update timestamp if it's an edit
            if (isUpdate) {
                payload.updated_at = nowIso;
            }

            const { error } = await (supabase.from("predictions") as any).upsert(payload, { onConflict: 'user_id,match_id' });

            if (error) throw error;
            setJustSaved(true);
            const savedDate = new Date();

            if (isUpdate) {
                setPredictionUpdatedAt(savedDate);
            } else {
                // First save: Set creation date locally
                setPredictionCreatedAt(savedDate);
                // Leave updated_at null to signify it's still clean
                setPredictionUpdatedAt(null);
            }
            
            setInitialComboActive(isComboActive);

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

    const handleDeactivateCombo = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || isLocked) return;
        
        // If there's no saved prediction yet, just clear local state
        if (!predictionCreatedAt && !predictionUpdatedAt) {
            setIsComboActive(false);
            setBetTotalGoals("");
            return;
        }

        setSaving(true);
        try {
            const nowIso = new Date().toISOString();
            const payload: any = {
                user_id: user.id,
                match_id: match.id,
                home_score: parseInt(betHome),
                away_score: parseInt(betAway),
                is_combo: false,
                combo_total_goals: null,
                updated_at: nowIso
            };

            const { error } = await (supabase.from("predictions") as any).upsert(payload, { onConflict: 'user_id,match_id' });

            if (error) throw error;
            
            // Clean up local tracking state
            setIsComboActive(false);
            setBetTotalGoals("");
            setInitialComboActive(false);
            setPredictionUpdatedAt(new Date());
            
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error("Error deactivating combo:", error);
            alert("Erro ao remover ficha: " + (error.message || JSON.stringify(error)));
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
                        setEnableTiebreaker(settings.enableSelectionTiebreaker || false);

                        // 3. Fetch Participants Selections with Fallback
                        let finalParticipants: any[] = [];

                        // Try new table
                        const { data: newParts } = await supabase
                            .from("championship_participants")
                            .select(`
                                user_id, 
                                team_selections,
                                profiles!inner(nickname, nome)
                            `)
                            .eq("championship_id", champId);

                        if (newParts && newParts.length > 0) {
                            // Map table structure to local structure
                            finalParticipants = newParts.map((p: any) => ({
                                userId: p.user_id,
                                teamSelections: p.team_selections || [],
                                nickname: p.profiles?.nickname || p.profiles?.nome || "Usuário"
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

                        // Exclude ghost user from missing predictions calculations
                        if (settings.ghostPlayer) {
                            finalParticipants = finalParticipants.filter(p => p.userId !== settings.ghostPlayer);
                        }

                        // Exclude Loia if disabled
                        if (!settings.enableLoia) {
                            const loiaPart = (settings.participants || []).find((p: any) => p.email === "lindoaldo@legacy.local");
                            const loId = loiaPart?.userId || loiaPart?.id || loiaPart?.user_id;
                            if (loId) {
                                finalParticipants = finalParticipants.filter(p => p.userId !== loId);
                            }
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

    const StatusBadgeComponent = ({ type = "all", className = "" }: { type?: "status" | "urgency" | "all", className?: string }) => {
        if ((type === "all" || type === "status") && isLive) return (
            <span className={cn("inline-flex items-center justify-center h-6 sm:h-7 text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 rounded-lg border  tracking-wider shrink-0 leading-none", 
                isColored ? "text-current bg-foreground/10 border-foreground/20" : "text-red-500 bg-red-500/10 border-red-500/20",
                className)}>
                AO VIVO
            </span>
        );
        if ((type === "all" || type === "status") && isFinished) return (
            <span className={cn(
                "inline-flex items-center justify-center h-6 sm:h-7 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 rounded-lg border uppercase tracking-wider shrink-0 leading-none", 
                isColored ? "text-current bg-foreground/10 border-foreground/20" : "text-slate-500 dark:text-slate-400 bg-muted dark:bg-slate-800/80 border-border dark:border-slate-700",
                className
            )}>
                FINAL
            </span>
        );

        // Urgency Badges
        if ((type === "all" || type === "urgency") && isCritical) return (
            <span className={cn("inline-flex items-center justify-center h-6 sm:h-7 gap-1 text-[10px] sm:text-[11px] font-bold text-red-500 bg-red-500/10 px-2 sm:px-3 rounded-lg border border-red-500/20  tracking-wider shrink-0 leading-none", className)}>
                <AlertTriangle className="h-3 w-3" /> ÚLTIMA CHANCE
            </span>
        );
        if ((type === "all" || type === "urgency") && isUrgent) return (
            <span className={cn("inline-flex items-center justify-center h-6 sm:h-7 gap-1 text-[10px] sm:text-[11px] font-bold text-yellow-500 bg-yellow-500/10 px-2 sm:px-3 rounded-lg border border-yellow-500/20 tracking-wider shrink-0 leading-none", className)}>
                <Clock className="h-3 w-3" /> NÃO ESQUEÇA
            </span>
        );

        return null;
    };

    return (
        <TooltipProvider delayDuration={0}>
            <Card
                className={cn(
                    "group relative overflow-hidden   border shadow-sm",
                    isFutureBlock ? "opacity-60 grayscale-[50%] cursor-not-allowed border-slate-800 bg-card dark:bg-slate-950/50" : (userResultClass ? userResultClass : "border-border bg-card dark:border-slate-800 dark:bg-slate-950/50"),
                    !isFutureBlock && canViewPredictions && !userResultClass ? "hover:bg-muted/50 dark:hover:bg-slate-900/80 cursor-pointer" : "",
                    !isFutureBlock && canViewPredictions && userResultClass ? "cursor-pointer" : "",
                    !isFutureBlock && !userResultClass && urgencyClass ? urgencyClass : ""
                )}
                onClick={isFutureBlock ? undefined : handleToggleExpand}
            >
                <CardContent className="p-3 sm:p-6 relative min-h-[160px] flex flex-col justify-center">
                    {/* 1. TOP INFO BAR (Responsive) */}
                    <div className="flex items-center justify-between w-full mb-2 sm:mb-6 px-1 sm:px-2">
                        
                        {/* LEFT: Trophy Icon/Championship Logo (Mobile) or Round (Desktop) */}
                        <div className="flex flex-1 justify-start items-center overflow-hidden">
                            <div className="md:hidden flex items-center shrink-0">
                                <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className="outline-none flex items-center justify-center">
                                            {(match.championshipLogoUrl || match.championship_logo) ? (
                                                <img src={match.championshipLogoUrl || match.championship_logo} className="h-12 w-auto max-w-[4rem] object-contain " alt="champ" />
                                            ) : (
                                                <Trophy className={cn("h-10 w-10", isColored ? "text-current" : "text-blue-500")} />
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="bottom" className="w-auto p-2 bg-popover border-border dark:bg-slate-900 dark:border-slate-800 text-popover-foreground dark:text-white text-xs font-bold pointer-events-none">
                                        {match.championshipName || "Campeonato"}
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="hidden md:flex items-center shrink-0">
                                <span className={cn(
                                    "text-[11px] font-bold px-2.5 py-1 rounded-md border uppercase whitespace-nowrap",
                                    isColored ? "text-current opacity-90 bg-foreground/10 border-foreground/20 dark:bg-slate-800/40 dark:border-slate-700/50" : "text-muted-foreground bg-muted dark:bg-slate-800/40 border-border dark:border-slate-700/50"
                                )}>
                                    {translateRoundName(match.round_name || match.round)}
                                </span>
                            </div>
                        </div>

                        {/* CENTER: Championship Name (Desktop Only) */}
                        <div className="hidden md:flex flex-[2] justify-center px-4 overflow-hidden">
                            <Popover>
                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="outline-none group/champ w-full truncate">
                                        <span className={cn(
                                            "text-[11px] font-bold uppercase tracking-[0.25em] text-center whitespace-nowrap",
                                            isColored ? "text-current opacity-90" : "text-blue-600 dark:text-blue-500"
                                        )}>
                                            {showChampionshipName ? match.championshipName || "CAMPEONATO" : ""}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="top" className="w-auto p-2 bg-popover border-border dark:bg-slate-900 dark:border-slate-800 text-popover-foreground dark:text-white text-xs font-bold pointer-events-none">
                                    {match.championshipName || "Campeonato"}
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* RIGHT: Combo Tokens, Status Badge & Edit Button */}
                        <div className="flex-1 flex justify-end flex-wrap items-center gap-2">
                            {/* COMBO TOKENS COUNTER (Visible on both Native layout and Mobile opposite to logo) */}
                            {comboEnabled && totalPhaseTokens > 0 && !isAdmin && showBetButton && (
                                <div className={cn(
                                    "inline-flex items-center justify-center h-6 sm:h-7 gap-1 text-[9px] sm:text-[10px] font-bold px-2 rounded-full border whitespace-nowrap shrink-0 leading-none",
                                    isColored ? "bg-foreground/10 border-foreground/20 text-current" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                )}>
                                    🌟 
                                    <span className={availableComboTokens === 0 ? "opacity-50" : (isColored ? "font-black" : "text-amber-400 font-black")}>
                                        {availableComboTokens}
                                    </span>
                                    <span className="opacity-40">/ {totalPhaseTokens}</span>
                                </div>
                            )}

                            {canEdit && !isEditing && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                >
                                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                            )}
                            <StatusBadgeComponent type="all" className="hidden md:inline-flex" />
                            <StatusBadgeComponent type="status" className="inline-flex md:hidden" />
                        </div>
                    </div>
                    
                    {isFutureBlock && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 dark:bg-background/40 pointer-events-none">
                            <span className="bg-slate-900/90 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
                                Fase Futura (Aguarde)
                            </span>
                        </div>
                    )}

                    {/* 2. MOBILE ONLY: Round (Centered) */}
                    <div className="md:hidden flex flex-col items-center justify-center mb-4 gap-1">
                        <span className={cn(
                            "text-[11px] font-bold uppercase",
                            isColored ? "text-current opacity-80" : "text-muted-foreground/80 dark:text-slate-400/80"
                        )}>
                            {translateRoundName(match.round_name || match.round)}
                        </span>
                    </div>

                    {/* 3. MAIN TEAMS AREA */}
                    <div className="relative flex flex-col items-center">
                        <div className="flex items-center justify-center w-full max-w-5xl mb-4 gap-4 sm:gap-12">
                            {/* Home Team */}
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                <span className="hidden md:block font-bold text-base lg:text-[19px] text-current dark:text-slate-100 truncate text-right">
                                    {match.home_team || match.homeTeamName}
                                </span>
                                <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className={cn(
                                            "h-12 w-12 sm:h-14 sm:w-14   flex items-center justify-center shrink-0 outline-none overflow-hidden",
                                            teamMode === 'selecoes' ? "rounded-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" : "rounded-lg"
                                        )}>
                                            <img
                                                src={match.home_team_crest || getFlagUrl(match.home_team || match.homeTeamName)}
                                                alt=""
                                                className={cn(
                                                    "",
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
                                            className="w-20 h-14 text-center text-2xl font-bold bg-background border-input"
                                        />
                                        <Input
                                            type="number"
                                            value={awayScore}
                                            onChange={(e) => setAwayScore(e.target.value)}
                                            className="w-20 h-14 text-center text-2xl font-bold bg-background border-input"
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleSaveScore} disabled={saving} className="h-8 w-8 text-green-600 dark:text-green-500">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                ) : showBetButton && !isLocked ? (
                                    <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-col items-center gap-3">
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
                                                    "h-7 text-[10px] font-bold px-4 rounded-full  ",
                                                    justSaved ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                                                )}
                                                onClick={handleSavePrediction}
                                                disabled={saving || betHome === "" || betAway === "" || (isComboActive && betTotalGoals === "")}
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
                                            
                                            {/* COMBO BUTTON */}
                                            {comboEnabled && (availableComboTokens > 0 || isComboActive) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();

                                                        if (isComboActive) {
                                                            // DEACTIVATE: instantly commit to DB so context reflects it
                                                            handleDeactivateCombo(e);
                                                        } else {
                                                            // ACTIVATE: Locally enable it. Waits for main save button.
                                                            if (availableComboTokens <= 0) {
                                                                alert("Você não tem mais fichas douradas disponíveis para esta rodada/fase.");
                                                                return;
                                                            }
                                                            setIsComboActive(true);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "h-7 text-[10px] mt-1 font-bold px-3 py-0 rounded-full border  truncate min-w-[100px]",
                                                        isComboActive 
                                                            ? "bg-amber-400/20 text-amber-500 border-amber-500 hover:bg-amber-400/30" 
                                                            : "border-slate-700 bg-transparent text-slate-500 hover:text-slate-300 hover:border-slate-500"
                                                    )}
                                                >
                                                    🌟 {isComboActive ? 'DESATIVAR FICHA' : 'USAR FICHA'}
                                                </Button>
                                            )}

                                            {/* TOTAL GOALS COMBO INPUT */}
                                            {comboEnabled && isComboActive && (
                                                <div className="flex flex-col items-center gap-1 mt-1">
                                                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                                                        Total de Gols na Partida
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={betTotalGoals}
                                                            onChange={(e) => setBetTotalGoals(e.target.value)}
                                                            className="w-16 h-8 text-center text-sm font-bold bg-amber-500/10 border-amber-500/30 focus:border-amber-500 text-amber-50"
                                                            placeholder="Ex: 3"
                                                        />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className={cn(
                                                                "h-8 w-8 transition-colors",
                                                                justSaved ? "text-green-500" : "text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
                                                            )}
                                                            onClick={handleSavePrediction}
                                                            disabled={saving || betHome === "" || betAway === "" || betTotalGoals === ""}
                                                        >
                                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : justSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {(predictionCreatedAt || predictionUpdatedAt) && (
                                            <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground font-medium opacity-70">
                                                <Clock className="h-2.5 w-2.5" />
                                                <span>
                                                    {(() => {
                                                        const showDate = predictionUpdatedAt || predictionCreatedAt;
                                                        // It is altered ONLY if updated_at exists AND is different from created_at
                                                        // (with 2 sec tolerance for legacy records that might have identical timestamps)
                                                        const isAltered = predictionUpdatedAt && predictionCreatedAt && Math.abs(predictionUpdatedAt.getTime() - predictionCreatedAt.getTime()) > 2000;

                                                        return (
                                                            <>
                                                                {isAltered ? "Última alteração em: " : "Adicionado em: "}
                                                                {showDate && format(showDate, "dd/MM HH:mm", { locale: ptBR })}
                                                            </>
                                                        );
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        {isLive || isFinished ? (
                                            <>
                                                <div className="bg-white dark:bg-black/80 px-5 py-2 sm:px-8 sm:py-3 rounded-2xl md:rounded-full border border-slate-200 dark:border-slate-800 flex items-center gap-4 sm:gap-8 min-w-[100px] sm:min-w-[140px] justify-center shadow-md">
                                                    <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-mono break-keep">{match.score_home ?? 0}</span>
                                                    <span className="text-slate-400 dark:text-slate-600 font-bold text-xl">-</span>
                                                    <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white font-mono break-keep">{match.score_away ?? 0}</span>
                                                </div>
                                                {!(isAdmin && !targetUserId) && (
                                                    <div className="mt-2 text-[9px] sm:text-[10px] font-medium opacity-80 flex items-center gap-1.5 justify-center">
                                                        <Clock className="h-3 w-3" />
                                                        {predictionCreatedAt || predictionUpdatedAt ? (
                                                            <span>
                                                                {(() => {
                                                                    const showDate = predictionUpdatedAt || predictionCreatedAt;
                                                                    const isAltered = predictionUpdatedAt && predictionCreatedAt && Math.abs(predictionUpdatedAt.getTime() - predictionCreatedAt.getTime()) > 2000;
                                                                    return (
                                                                        <>
                                                                            {isAltered ? "Última alteração em: " : "Adicionado em: "}
                                                                            {showDate && format(showDate, "dd/MM HH:mm", { locale: ptBR })}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </span>
                                                        ) : (
                                                            <span>Nenhum placar foi adicionado</span>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
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
                                            "h-12 w-12 sm:h-14 sm:w-14   flex items-center justify-center shrink-0 outline-none overflow-hidden rounded-lg",
                                            teamMode === 'selecoes' ? "rounded-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" : "rounded-lg"
                                        )}>
                                            <img
                                                src={match.away_team_crest || getFlagUrl(match.away_team || match.awayTeamName)}
                                                alt=""
                                                className={cn(
                                                    "",
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
                                <span className="hidden md:block font-bold text-base lg:text-[19px] text-current dark:text-slate-100 truncate text-left">
                                    {match.away_team || match.awayTeamName}
                                </span>
                            </div>
                        </div>

                        {/* Date / Time / Admin Actions */}
                        <div className="flex flex-col items-center justify-center gap-2 mb-2">
                            <div className={cn("flex items-center justify-center gap-2 font-semibold h-7 sm:h-8", isColored ? "text-current opacity-80" : "text-muted-foreground")}>
                                {isLive ? (
                                    isAdmin && !isEditing && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] font-bold border-red-600/30 text-red-600 dark:text-red-500 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400  px-4 rounded-full shadow-sm"
                                            onClick={(e) => { e.stopPropagation(); setShowFinalizeDialog(true); }}
                                        >
                                            FINALIZAR PARTIDA
                                        </Button>
                                    )
                                ) : showCountdown ? (
                                    <div className="flex items-center gap-1.5 bg-red-500/5 dark:bg-red-500/10 px-3 py-1 rounded-full border border-red-500/10 ">
                                        <Clock className="h-3.5 w-3.5 text-red-500" />
                                        <span className="text-[11px] sm:text-[13px] text-red-600 dark:text-red-500 font-bold uppercase tracking-wider">
                                            {minutesToStart > 0 && "Começa em "}
                                            <Countdown targetDate={matchDate} onZero={handleAutoLive} />
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <Calendar className={cn("h-3.5 w-3.5", isColored ? "text-current opacity-80" : "text-muted-foreground/60")} />
                                        <span className="text-[11px] sm:text-[13px] font-bold">
                                            {formatMatchDate(match.date, match.championship_id)}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="md:hidden">
                                <StatusBadgeComponent type="urgency" />
                            </div>
                        </div>

                        {/* Footer indicator */}
                        {canViewPredictions && (
                            <div className="opacity-10 group-hover:opacity-40 transition-opacity mt-2">
                                <ChevronDown className={`h-4 w-4 text-foreground ${expanded ? 'rotate-180' : ''}`} />
                            </div>
                        )}
                        

                    </div>
                </CardContent>

                {/* PREDICTIONS SECTION */}
                {expanded && (
                    <div className="border-t border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-950">
                        <div className="p-4 sm:p-6 space-y-4">

                            {/* Header Section */}
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={cn("text-xs font-bold uppercase tracking-wider", isColored ? "text-current opacity-80" : "text-muted-foreground")}>Palpites da Galera</h4>
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        if (isAdmin && participantsData.length > 0) {
                                            const predictedIds = new Set(predictions.map(p => p.user_id));
                                            const missing = participantsData.filter(p => !predictedIds.has(p.userId));
                                            const total = participantsData.length;
                                            const predictedCount = total - missing.length; // Only count participants

                                            if (missing.length > 0) {
                                                return (
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button className={cn(
                                                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full cursor-help outline-none border",
                                                                    isColored ? "bg-foreground/10 border-foreground/20 text-current" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                                                )}>
                                                                    <UserX className="h-3 w-3" />
                                                                    <span className="text-[10px] font-bold">{predictedCount}/{total} palpites</span>
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side="bottom" className="bg-slate-900 border-slate-800 text-white w-auto max-w-[200px] p-3">
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase border-b border-white/10 pb-1 mb-1">Faltam Palpitar ({missing.length}):</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {missing.map((p, i) => (
                                                                            <span key={i} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-200">
                                                                                {p.nickname || "User" + p.userId.slice(0, 4)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                        isColored ? "bg-foreground/10 text-current border-foreground/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20"
                                                    )}>
                                                        {predictedCount}/{total} palpites
                                                    </span>
                                                );
                                            }
                                        }

                                        // Fallback for non-admin or no participantsData
                                        return (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                isColored ? "bg-foreground/10 text-current border-foreground/20" : "bg-muted dark:bg-slate-800 text-muted-foreground border-border"
                                            )}>
                                                {predictions.length} palpites
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {loadingPreds ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (() => {
                                const displayPredictions = [...predictions];
                                if ((isLive || isFinished || isAdmin) && participantsData.length > 0) {
                                    const predictedUserIds = new Set(predictions.map(p => p.user_id));
                                    participantsData.forEach(p => {
                                        if (!predictedUserIds.has(p.userId)) {
                                            displayPredictions.push({
                                                isMissing: true,
                                                user_id: p.userId,
                                                home_score: null,
                                                away_score: null,
                                                points: 0,
                                            });
                                        }
                                    });
                                }
                                displayPredictions.sort((a, b) => (b.points || 0) - (a.points || 0));

                                return displayPredictions.length > 0 ? (
                                <div className="space-y-2">
                                    {displayPredictions.map((pred) => {
                                        let userProfile = users.find(u => u.id === pred.user_id);
                                        if (!userProfile) {
                                            // Fallback for ghost users (like Loia) not in the main users table
                                            const pData = participantsData.find(p => p.userId === pred.user_id);
                                            if (pData) {
                                                const isLoia = pData.nickname === "Lóia" || pData.nickname === "Lindoaldo" || pData.email === "lindoaldo@legacy.local";
                                                userProfile = {
                                                    id: pData.userId,
                                                    nickname: pData.nickname,
                                                    nome: pData.nickname,
                                                    foto_perfil: isLoia ? "https://qgdiyngonrofriocxnla.supabase.co/storage/v1/object/public/avatars/lindoaldo_1780852852366.jpg" : ""
                                                };
                                            }
                                        }

                                        const isComputed = isLive || isFinished;
                                        let points = pred.points || 0;
                                        
                                        const hasPredictionData = pred.home_score != null && pred.away_score != null;

                                        const isExactDynamic = hasPredictionData && isComputed && (pred.home_score === match.score_home && pred.away_score === match.score_away);
                                        const isWinnerDynamic = hasPredictionData && isComputed && Math.sign(pred.home_score - pred.away_score) === Math.sign((match.score_home || 0) - (match.score_away || 0));

                                        const hitGoals = hasPredictionData && pred.is_combo && pred.combo_total_goals === ((match.score_home ?? 0) + (match.score_away ?? 0));
                                        
                                        const isCombo = isExactDynamic && hitGoals;
                                        const isBonus = !isExactDynamic && hitGoals;
                                        const usedToken = pred.is_combo;

                                        // Recalcula os pontos ao vivo para exibir imediatamente (Mesmo antes do Cron rodar)
                                        if (isLive) {
                                            let livePoints = 0;
                                            if (isCombo) livePoints = 5;
                                            else if (isExactDynamic) livePoints = 3;
                                            else if (isWinnerDynamic) livePoints = 1;
                                            else if (isBonus) livePoints = 2;
                                            
                                            // Usa o livePoints se for maior que o salvo no banco (banco pode estar 0)
                                            if (livePoints > points) {
                                                points = livePoints;
                                            }
                                        }

                                        const isZero = isComputed && points === 0;

                                        let bgClass = "";
                                        let badgeClass = "";

                                        if (!isComputed) {
                                            bgClass = "bg-slate-100 border-slate-200 hover:bg-slate-200 dark:bg-slate-900/40 dark:border-slate-800/60 dark:hover:bg-slate-900/60 text-foreground";
                                            badgeClass = "hidden"; // Esconde o badge de pontos para jogos futuros
                                        } else if (isCombo) {
                                            bgClass = "bg-yellow-500 border-yellow-600 text-white hover:bg-yellow-600 dark:bg-yellow-900/40 dark:border-yellow-600/40 dark:hover:bg-yellow-800/40 shadow-sm dark:text-foreground";
                                            badgeClass = "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-sm ring-2 ring-white/60 dark:ring-yellow-400/50 scale-105";
                                        } else if (isExactDynamic) {
                                            bgClass = "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-600/60 dark:hover:bg-emerald-900/50 shadow-sm dark:text-foreground";
                                            badgeClass = "bg-emerald-500 text-white shadow-sm ring-2 ring-white/60 dark:ring-emerald-400/50 scale-110";
                                        } else if (isWinnerDynamic) {
                                            bgClass = "bg-blue-600 border-blue-700 text-white hover:bg-blue-700 dark:bg-blue-950/50 dark:border-blue-800/50 dark:hover:bg-blue-900/50 dark:text-foreground";
                                            badgeClass = "bg-blue-600 text-white font-bold ring-2 ring-white/60 dark:ring-transparent shadow-sm";
                                        } else if (isBonus) {
                                            bgClass = "bg-slate-500 border-slate-600 text-white hover:bg-slate-600 dark:bg-slate-700/60 dark:border-slate-400/50 dark:hover:bg-slate-600/60 dark:text-foreground";
                                            badgeClass = "bg-gradient-to-br from-slate-200 to-slate-400 text-black shadow-sm ring-2 ring-white/60 dark:ring-slate-300/50";
                                        } else {
                                            bgClass = "bg-red-600 border-red-700 text-white hover:bg-red-700 dark:bg-red-950/60 dark:border-red-800/60 dark:hover:bg-red-900/50 dark:text-foreground";
                                            badgeClass = "bg-red-600 text-white font-bold ring-2 ring-white/60 dark:ring-transparent shadow-sm";
                                        }

                                        return (
                                            <div key={pred.id || pred.user_id} className={`grid grid-cols-[1fr_auto_1fr] sm:grid-cols-3 items-center gap-2 p-3 rounded-xl border transition-colors duration-200 ${bgClass}`}>
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
                                                            className="text-sm font-bold text-current truncate mb-0.5 hover:opacity-80 transition-opacity"
                                                        >
                                                            {userProfile?.nickname || userProfile?.nome || "User"}
                                                        </Link>
                                                        <div className="h-[14px]" />
                                                    </div>
                                                </div>

                                                {/* Center: Score */}
                                                <div className="flex justify-center flex-col sm:flex-row items-center gap-1 sm:gap-3">
                                                    {pred.isMissing ? (
                                                        <div className="font-mono font-bold text-lg text-current bg-foreground/10 px-4 py-1 rounded-lg border border-border whitespace-nowrap shadow-sm">
                                                            - x -
                                                        </div>
                                                    ) : (
                                                        <div className="font-mono font-bold text-lg text-current tracking-widest bg-foreground/10 px-3 py-1 rounded-lg whitespace-nowrap">
                                                            {pred.home_score} - {pred.away_score}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Points Badge */}
                                                <div className="flex justify-end items-center gap-2">
                                                    {usedToken && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex justify-center items-center gap-1 opacity-70 hover:opacity-100 transition-opacity bg-background/50 px-1.5 py-0.5 rounded cursor-help">
                                                                    <Gem className="h-3 w-3 text-cyan-400" />
                                                                    <span className="text-[11px] font-bold font-mono text-cyan-200">{pred.combo_total_goals}G</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-slate-900 text-white border-slate-800">
                                                                Ficha utilizada prevendo <span className="text-cyan-400 font-bold">{pred.combo_total_goals}</span> gols na partida.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[13px] font-black shadow-sm shrink-0  ${badgeClass}`}>
                                                        {isZero ? "0" : `+${points}`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-muted bg-muted/10">
                                    <p className="text-xs text-muted-foreground">
                                        {isAdmin ? "Nenhum palpite registrado ainda." : "Nenhum palpite para exibir."}
                                    </p>
                                </div>
                            );
                        })()}
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
