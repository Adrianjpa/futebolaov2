"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Siren, Loader2 } from "lucide-react";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const { profile, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await (supabase.from("system_settings").select("data").eq("id", "config").single() as any);
                if (data) setSettings(data.data);
            } catch (e) {
                console.error("Maintenance check error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [supabase]);

    if (authLoading || loading) return null;

    // CALCULATE MAINTENANCE STATUS
    const now = new Date();
    const manualLock = settings?.maintenanceMode === true;

    // Safety check for date strings
    const lockTime = (settings?.lockDate && settings?.lockTime)
        ? new Date(`${settings.lockDate}T${settings.lockTime}`)
        : null;
    const unlockTime = (settings?.returnDate && settings?.returnTime)
        ? new Date(`${settings.returnDate}T${settings.returnTime}`)
        : null;

    let isMaintenance = manualLock;

    // 1. If we have a lock time, and we passed it -> Lock
    if (lockTime && now >= lockTime) {
        isMaintenance = true;
    }

    // 2. If we have an unlock time, and we passed it -> Unlock (highest priority)
    if (unlockTime && now >= unlockTime) {
        isMaintenance = false;
    }

    const isAdmin = profile?.funcao === "admin" || profile?.funcao === "moderator";

    if (isMaintenance && !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white selection:bg-yellow-500/30">
                <div className="max-w-md w-full space-y-8 text-center bg-slate-900/50 p-10 rounded-3xl border border-yellow-500/20 shadow-[0_0_50px_-12px_rgba(234,179,8,0.3)] backdrop-blur-md relative overflow-hidden group">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/10 blur-[80px] rounded-full group-hover:bg-yellow-500/20 transition-colors duration-1000" />

                    <div className="flex justify-center relative">
                        <div className="p-5 bg-yellow-500/10 rounded-2xl animate-pulse ring-1 ring-yellow-500/20">
                            <Siren className="h-10 w-10 text-yellow-500" />
                        </div>
                    </div>

                    <div className="space-y-4 relative">
                        <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
                            {settings?.maintenanceTitle || "Modo Manutenção"}
                        </h1>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            {settings?.maintenanceMessage || "O sistema está passando por uma atualização rápida. Voltaremos em breve com novidades!"}
                        </p>

                        {(settings?.returnDate || settings?.returnTime) && (
                            <div className="pt-6 border-t border-white/5 mt-8 space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Previsão de Retorno</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/5 rounded-full border border-yellow-500/10">
                                    <span className="text-lg font-mono font-bold text-yellow-500">
                                        {settings?.returnDate && new Date(settings.returnDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                        {settings?.returnTime && ` às ${settings.returnTime}`}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 text-[11px] text-slate-600 font-bold uppercase tracking-widest relative">
                        FuteBolão <span className="text-yellow-500/50 mx-1">•</span> v2.0
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
