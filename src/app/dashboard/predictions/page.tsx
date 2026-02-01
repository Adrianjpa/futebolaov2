"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";
import { format } from "date-fns";
import { Calendar, Clock, Save, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Match {
    id: string;
    home_team: string;
    away_team: string;
    home_team_crest?: string;
    away_team_crest?: string;
    date: string;
    round: number;
    championship_id: string;
    status: "scheduled" | "live" | "finished";
}

interface Prediction {
    match_id: string;
    home_score: number;
    away_score: number;
}

export default function PredictionsPage() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const supabase = createClient();
    const [matches, setMatches] = useState<Match[]>([]);
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !profile) return;

        // Check if user is admin
        if (profile.funcao === "admin" || profile.funcao === "moderator") {
            router.push("/dashboard"); // Redirect admins away from predictions
            return;
        }

        fetchMatchesAndPredictions();
    }, [user, profile, router]);

    const fetchMatchesAndPredictions = async () => {
        setLoading(true);
        try {
            // 1. Fetch active matches (scheduled)
            const { data: matchesData } = await (supabase
                .from("matches")
                .select("*")
                .eq("status", "scheduled")
                .order("date", { ascending: true }) as any);

            setMatches((matchesData || []) as Match[]);

            // 2. Fetch user predictions for these matches
            if (user) {
                const { data: predsData } = await (supabase
                    .from("predictions")
                    .select("*")
                    .eq("user_id", user.id) as any);

                const preds: Record<string, Prediction> = {};
                (predsData || []).forEach((p: any) => {
                    preds[p.match_id] = {
                        match_id: p.match_id,
                        home_score: p.home_score,
                        away_score: p.away_score
                    };
                });
                setPredictions(preds);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (matchId: string, type: 'home' | 'away', value: string) => {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return;

        setPredictions(prev => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                match_id: matchId,
                [type === 'home' ? 'home_score' : 'away_score']: numValue,
                [type === 'home' ? 'away_score' : 'home_score']: (prev[matchId] as any)?.[type === 'home' ? 'away_score' : 'home_score'] ?? 0
            }
        }));
    };

    const handleSavePrediction = async (matchId: string) => {
        if (!user) return;
        const pred = predictions[matchId];
        if (!pred) return;

        // Double check locking logic
        const match = matches.find(m => m.id === matchId);
        if (match) {
            const matchDate = new Date(match.date);
            const now = new Date();
            if (now >= matchDate || match.status !== 'scheduled') {
                alert("Tempo esgotado! Esta partida já começou.");
                return;
            }
        }

        setSaving(matchId);
        try {
            const { error } = await (supabase
                .from("predictions") as any)
                .upsert({
                    user_id: user.id,
                    match_id: matchId,
                    home_score: pred.home_score ?? 0,
                    away_score: pred.away_score ?? 0
                });

            if (error) throw error;
        } catch (error) {
            console.error("Error saving prediction:", error);
            alert("Erro ao salvar palpite.");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <div>Carregando jogos...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Meus Palpites</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {matches.length === 0 && (
                    <p className="text-muted-foreground col-span-full">Nenhum jogo disponível para palpite no momento.</p>
                )}
                {matches.map((match) => {
                    const pred = predictions[match.id] || { home_score: '', away_score: '' };
                    const isSaving = saving === match.id;

                    const matchDate = new Date(match.date);
                    const now = new Date();
                    const isLocked = now >= matchDate || match.status !== 'scheduled';

                    return (
                        <Card key={match.id} className={`overflow-hidden border-primary/10 ${isLocked ? 'opacity-75 bg-muted/10' : ''}`}>
                            <CardHeader className="bg-muted/30 pb-2 relative">
                                {isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] z-10">
                                        <div className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full shadow-sm">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-bold text-muted-foreground">Fechado</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                                    <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" /> {format(new Date(match.date), "dd/MM")}</span>
                                    <span className="flex items-center"><Clock className="mr-1 h-3 w-3" /> {format(new Date(match.date), "HH:mm")}</span>
                                </div>
                                <CardTitle className="text-center text-sm font-medium text-muted-foreground">{match.round}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 relative">
                                <div className="flex items-center justify-between gap-4 mb-6">
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        {match.home_team_crest && <img src={match.home_team_crest} alt={match.home_team} className="h-12 w-12 object-contain mb-1" />}
                                        <div className="font-bold text-center leading-tight h-10 flex items-center justify-center text-sm">{match.home_team}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-16 h-14 text-center text-2xl font-bold border-2 border-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl shadow-sm bg-background"
                                            value={pred.home_score}
                                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                                            disabled={isLocked}
                                            placeholder="-"
                                        />
                                    </div>
                                    <div className="text-muted-foreground font-bold pt-12 text-xl">X</div>
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        {match.away_team_crest && <img src={match.away_team_crest} alt={match.away_team} className="h-12 w-12 object-contain mb-1 drop-shadow-sm" />}
                                        <div className="font-bold text-center leading-tight h-10 flex items-center justify-center text-sm">{match.away_team}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-16 h-14 text-center text-2xl font-bold border-2 border-muted-foreground/20 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl shadow-sm bg-background"
                                            value={pred.away_score}
                                            onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                                            disabled={isLocked}
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => handleSavePrediction(match.id)}
                                    disabled={isSaving || isLocked}
                                >
                                    {isSaving ? "Salvando..." : (
                                        <>
                                            {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                            {isLocked ? "Palpites Encerrados" : "Salvar Palpite"}
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
