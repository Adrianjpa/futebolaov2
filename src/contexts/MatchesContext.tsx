"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface MatchesContextType {
    matches: any[];
    championships: any[];
    championshipsMap: Record<string, any>;
    userPredictions: Set<string>;
    userCombos: Set<string>;
    userParticipation: Set<string>;
    globalPhaseRules: Record<string, Record<string, number>>;
    globalComboUsage: Record<string, Record<string, number>>;
    loading: boolean;
    refreshMatches: () => Promise<void>;
}

const MatchesContext = createContext<MatchesContextType | undefined>(undefined);

export function MatchesProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const supabase = createClient();

    const [matches, setMatches] = useState<any[]>([]);
    const [championships, setChampionships] = useState<any[]>([]);
    const [championshipsMap, setChampionshipsMap] = useState<Record<string, any>>({});
    const [userPredictions, setUserPredictions] = useState<Set<string>>(new Set());
    const [userCombos, setUserCombos] = useState<Set<string>>(new Set());
    const [userParticipation, setUserParticipation] = useState<Set<string>>(new Set());
    const [globalPhaseRules, setGlobalPhaseRules] = useState<Record<string, Record<string, number>>>({});
    const [globalComboUsage, setGlobalComboUsage] = useState<Record<string, Record<string, number>>>({});
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const fetchMatches = useCallback(async () => {
        if (!user) return;

        try {
            // 1. Fetch Championships
            const { data: champs } = await (supabase.from("championships") as any).select("*");
            const champMap: Record<string, any> = {};
            champs?.forEach((c: any) => { champMap[c.id] = c; });
            setChampionships(champs || []);
            setChampionshipsMap(champMap);

            // 2. Fetch User Predictions
            const { data: preds } = await (supabase
                .from("predictions") as any)
                .select("match_id, is_combo")
                .eq("user_id", user.id);
            const predSet = new Set((preds as any[])?.map(p => p.match_id));
            const comboSet = new Set((preds as any[])?.filter(p => p.is_combo).map(p => p.match_id));
            setUserPredictions(predSet);
            setUserCombos(comboSet);

            // 3. Fetch User Participation
            const { data: parts } = await (supabase
                .from("championship_participants") as any)
                .select("championship_id")
                .eq("user_id", user.id);
            const partSet = new Set((parts as any[])?.map(p => p.championship_id));

            // Also check participants in championship settings
            champs?.forEach((c: any) => {
                const settingsParticipants = (c.settings as any)?.participants || [];
                if (settingsParticipants.some((p: any) => p.userId === user.id)) {
                    partSet.add(c.id);
                }
            });

            setUserParticipation(partSet);

            // 4. Fetch Global Phase Rules
            const { data: allRules } = await (supabase.from('championship_phase_rules') as any).select('championship_id, phase, combo_tokens');
            const newPhaseRules: Record<string, Record<string, number>> = {};
            allRules?.forEach((r: any) => {
                if (!newPhaseRules[r.championship_id]) newPhaseRules[r.championship_id] = {};
                newPhaseRules[r.championship_id][r.phase] = r.combo_tokens;
            });
            setGlobalPhaseRules(newPhaseRules);

            // 5. Fetch Global Combo Usage for the user
            const { data: allUsage } = await (supabase
                .from('predictions') as any)
                .select('match_id, matches!inner(championship_id, round, round_name)')
                .eq('user_id', user.id)
                .eq('is_combo', true);

            const newComboUsage: Record<string, Record<string, number>> = {};
            allUsage?.forEach((pred: any) => {
                const champId = pred.matches?.championship_id;
                const phase = pred.matches?.round_name || pred.matches?.round?.toString();
                if (champId && phase) {
                    if (!newComboUsage[champId]) newComboUsage[champId] = {};
                    newComboUsage[champId][phase] = (newComboUsage[champId][phase] || 0) + 1;
                }
            });
            setGlobalComboUsage(newComboUsage);

            // 6. Fetch Matches (Next 7 days + Live)
            const todayStart = new Date();
            todayStart.setDate(todayStart.getDate() - 1); // Get Yesterday to show recent results
            todayStart.setHours(0, 0, 0, 0);

            const { data: matchesData } = await (supabase
                .from("matches") as any)
                .select("*")
                .gte("date", todayStart.toISOString())
                .order("date", { ascending: true });

            const formatted = matchesData?.map((m: any) => ({
                ...m,
                championshipName: champMap[m.championship_id]?.name,
                championshipLogoUrl: champMap[m.championship_id]?.settings?.iconUrl
            })) || [];

            setMatches(formatted);
        } catch (error) {
            console.error("Error in MatchesProvider fetch:", error);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        fetchMatches();

        // Realtime Listener
        const channel = supabase
            .channel('global-matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchMatches();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, (payload: any) => {
                if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
                    fetchMatches();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'championship_participants' }, (payload: any) => {
                if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
                    fetchMatches();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchMatches, supabase]);

    return (
        <MatchesContext.Provider value={{
            matches,
            championships,
            championshipsMap,
            userPredictions,
            userCombos,
            userParticipation,
            globalPhaseRules,
            globalComboUsage,
            loading: isInitialLoad, // Only show heavy loader on first app load
            refreshMatches: fetchMatches
        }}>
            {children}
        </MatchesContext.Provider>
    );
}

export function useMatches() {
    const context = useContext(MatchesContext);
    if (!context) throw new Error("useMatches must be used within MatchesProvider");
    return context;
}
