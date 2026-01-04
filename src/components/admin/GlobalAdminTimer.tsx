"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";

export function GlobalAdminTimer() {
    const { profile } = useAuth();
    const [progress, setProgress] = useState(0); // Start empty
    const [updateIntervalMinutes, setUpdateIntervalMinutes] = useState(3);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const supabase = createClient();
    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    // 1. Fetch Settings & Initial State
    useEffect(() => {
        if (!isAdmin) return;

        const fetchData = async () => {
            try {
                // Get Interval from Settings
                const { data: settingsData, error: settingsError } = await (supabase
                    .from("system_settings")
                    .select("data")
                    .eq("id", "config")
                    .single() as any);

                if (!settingsError && settingsData?.data?.apiUpdateInterval) {
                    setUpdateIntervalMinutes(settingsData.data.apiUpdateInterval);
                }

                // Get Last Update (Heartbeat)
                const { data: heartbeatData, error: heartbeatError } = await (supabase
                    .from("system_settings") as any)
                    .select("updated_at")
                    .eq("id", "config")
                    .single();

                if (!heartbeatError && heartbeatData?.updated_at) {
                    setLastUpdate(new Date(heartbeatData.updated_at));
                } else if (!heartbeatError) {
                    // If no heartbeat yet, fallback to matches for backward compatibility or first run
                    const { data: matchData } = await (supabase
                        .from("matches") as any)
                        .select("updated_at")
                        .order("updated_at", { ascending: false })
                        .limit(1);
                    if (matchData?.[0]?.updated_at) {
                        setLastUpdate(new Date(matchData[0].updated_at));
                    }
                }

                setIsVisible(true);
            } catch (err) {
                console.error("Timer fetch error:", err);
                setIsVisible(true);
            }
        };

        fetchData();
        const poller = setInterval(fetchData, 60000); // Re-sync every minute
        return () => clearInterval(poller);
    }, [isAdmin, supabase]);

    // 2. Countdown Logic
    useEffect(() => {
        if (!isAdmin || !lastUpdate) return;

        const tick = () => {
            const now = new Date().getTime();
            const last = lastUpdate.getTime();
            const intervalMs = updateIntervalMinutes * 60 * 1000;

            // Calculate next expected update time
            let next = last + intervalMs;
            while (next < now) {
                next += intervalMs;
            }

            const remainingMs = Math.max(0, next - now);
            const remainingSec = Math.ceil(remainingMs / 1000);

            // Calculate Progress (0% to 100% filling up)
            // If remaining = interval (start), filled = 0%
            // If remaining = 0 (end), filled = 100%
            const totalSec = updateIntervalMinutes * 60;
            const filledPct = ((totalSec - remainingSec) / totalSec) * 100;

            setProgress(Math.min(100, Math.max(0, filledPct)));
        };

        const timer = setInterval(tick, 1000);
        tick();

        return () => clearInterval(timer);
    }, [isAdmin, lastUpdate, updateIntervalMinutes]);

    if (!isVisible || !isAdmin) return null;

    return (
        <div className="w-full h-1.5 bg-yellow-500/5 relative overflow-hidden shrink-0 border-b border-yellow-500/10">
            <div
                className="h-full bg-yellow-500 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
