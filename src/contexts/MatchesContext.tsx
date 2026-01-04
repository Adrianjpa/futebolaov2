"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface MatchesContextType {
    matches: any[];
    championships: any[];
    championshipsMap: Record<string, any>;
    userPredictions: Set<string>;
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
                .select("match_id")
                .eq("user_id", user.id);
            const predSet = new Set((preds as any[])?.map(p => p.match_id));
            setUserPredictions(predSet);

            // 3. Fetch Matches (Next 7 days + Live)
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
