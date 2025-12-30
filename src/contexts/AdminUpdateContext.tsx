"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface AdminUpdateContextType {
    isUpdating: boolean;
    logs: string[];
    progress: number;
    intervalMinutes: number;
    runUpdate: () => Promise<void>;
}

const AdminUpdateContext = createContext<AdminUpdateContextType | undefined>(undefined);

export function AdminUpdateProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth();
    const isAdmin = profile?.funcao === 'admin';
    const supabase = createClient();

    const [isUpdating, setIsUpdating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [intervalMinutes, setIntervalMinutes] = useState(3);
    const [matchesToUpdate, setMatchesToUpdate] = useState<any[]>([]);
    const [championshipsMap, setChampionshipsMap] = useState<Record<string, any>>({});

    const activeMatchesRef = useRef<any[]>([]);
    const championshipsMapRef = useRef<Record<string, any>>({});
    const isUpdatingRef = useRef(false);

    const addLog = (msg: string) => {
        console.log(`[AutoUpdate] ${msg}`);
        setLogs(prev => [...prev.slice(-49), `${new Date().toLocaleTimeString()} - ${msg}`]);
    };

    // 1. Listen for Config
    useEffect(() => {
        if (!isAdmin) return;

        const fetchConfig = async () => {
            const { data } = await supabase
                .from("system_settings")
                .select("*")
                .eq("id", "config")
                .single();

            if (data) {
                const settings = data.settings as any;
                setIntervalMinutes(settings?.apiUpdateInterval || 3);
            }
        };

        fetchConfig();
    }, [isAdmin]);

    // 2. Fetch Matches (Realtime)
    useEffect(() => {
        if (!isAdmin) return;

        const channel = supabase
            .channel('matches-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
                const match = payload.new as any;
                if (['live', 'IN_PLAY', 'PAUSED', 'finished', 'FINISHED'].includes(match.status)) {
                    addLog(`Mudança detectada: ID ${match.id} -> ${match.score_home}x${match.score_away} [${match.status}]`);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin]);

    // 4. Core Update Logic
    const runUpdate = async () => {
        if (isUpdatingRef.current) return;
        isUpdatingRef.current = true;
        setIsUpdating(true);
        // Don't clear logs here, append instead or clear after some time
        addLog("Iniciando ciclo de atualização (API)...");

        try {
            const res = await fetch("/api/admin/force-update", {
                method: "POST"
            });
            const result = await res.json();

            if (result.success) {
                addLog(`Sucesso: ${result.message}`);
                if (result.updates > 0) {
                    addLog(`${result.updates} jogos atualizados.`);
                }
            } else {
                addLog(`ERRO: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            addLog(`ERRO EXCEÇÃO: ${error}`);
        } finally {
            setIsUpdating(false);
            isUpdatingRef.current = false;
        }
    };

    // 5. Timer Logic (Smoothed Time-Based Progress)
    const lastRunPeriodRef = useRef<number>(0);

    useEffect(() => {
        if (!isAdmin) return;

        const updateFreq = 200; // ms
        const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

        // Initialize period to avoid immediate run on mount
        lastRunPeriodRef.current = Math.floor(Date.now() / intervalMs);

        const timer = setInterval(() => {
            const now = Date.now();
            const currentPeriod = Math.floor(now / intervalMs);

            // Calculate progress based on absolute time
            const rawProgress = (now % intervalMs) / intervalMs;
            setProgress(rawProgress * 100);

            // Check boundary crossing
            if (currentPeriod > lastRunPeriodRef.current) {
                lastRunPeriodRef.current = currentPeriod;
                runUpdate();
            }

        }, updateFreq);

        return () => clearInterval(timer);
    }, [isAdmin, intervalMinutes]);

    return (
        <AdminUpdateContext.Provider value={{ isUpdating, logs, progress, intervalMinutes, runUpdate }}>
            {children}
        </AdminUpdateContext.Provider>
    );
}

export function useAdminUpdate() {
    const context = useContext(AdminUpdateContext);
    if (context === undefined) {
        throw new Error("useAdminUpdate must be used within an AdminUpdateProvider");
    }
    return context;
}
