"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { BannerConfigForm } from "@/components/banner/BannerConfigForm";
import { ChampionBanner } from "@/components/banner/ChampionBanner";
import { BannerConfig, BannerWinner } from "@/types/banner";
import { useAdminUpdate } from "@/contexts/AdminUpdateContext";
import { getCachedData } from "@/utils/cache";

export function UpdateDebugger() {
    const [loading, setLoading] = useState(true);
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [championshipsMap, setChampionshipsMap] = useState<Record<string, any>>({});
    const [updating, setUpdating] = useState(false);
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const activeMatchesRef = useRef<any[]>([]);
    const championshipsMapRef = useRef<Record<string, any>>({});
    const [lastSystemUpdate, setLastSystemUpdate] = useState<Date | null>(null);

    const [legacyBannerMode, setLegacyBannerMode] = useState(false);
    const [legacyWinners, setLegacyWinners] = useState<BannerWinner[]>([]);
    const [bannerConfig, setBannerConfig] = useState<BannerConfig>({
        active: true,
        titleColor: "#FFFFFF",
        subtitleColor: "#FBBF24",
        namesColor: "#FFFFFF",
        displayMode: "photo_and_names",
        layoutStyle: "modern"
    });

    const handleLoadLegacyForBanner = async () => {
        try {
            // Simplified for this tool: Hardcoded known winners from the JSON we just processed
            const winners: BannerWinner[] = [
                {
                    userId: "adriano_legacy",
                    displayName: "Adriano",
                    photoUrl: "",
                    position: "champion"
                },
                {
                    userId: "elisson_legacy",
                    displayName: "Elisson",
                    photoUrl: "",
                    position: "gold_winner"
                },
                {
                    userId: "anderson_legacy",
                    displayName: "Anderson",
                    photoUrl: "",
                    position: "gold_winner"
                }
            ];

            setLegacyWinners(winners);
            setLegacyBannerMode(!legacyBannerMode);
            setDebugLogs(prev => [...prev, "Dados da Euro 2012 carregados para o Banner!"]);

        } catch (e) {
            console.error(e);
        }
    };

    const supabase = createClient();

    // 1. Fetch Static Data & Listeners
    useEffect(() => {
        const fetchChamps = async () => {
            const { data } = await (supabase
                .from("championships")
                .select("*") as any);

            const map: Record<string, any> = {};
            data?.forEach((c: any) => {
                map[c.id] = c;
            });
            setChampionshipsMap(map);
            championshipsMapRef.current = map;
        };
        fetchChamps();

        // Check last system update (proven by DB)
        const fetchLastUpdate = async () => {
            const { data } = await (supabase
                .from("matches")
                .select("updated_at")
                .order("updated_at", { ascending: false })
                .limit(1) as any);

            if (data?.[0]?.updated_at) {
                setLastSystemUpdate(new Date(data[0].updated_at));
            }
        };
        fetchLastUpdate();

        // Poll for last update every minute to show cron activity
        const pollInterval = setInterval(fetchLastUpdate, 60000);
        return () => clearInterval(pollInterval);
    }, []);

    useEffect(() => {
        if (Object.keys(championshipsMap).length === 0) return;

        setLoading(true);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const fetchLive = async () => {
            const { data } = await (supabase
                .from("matches")
                .select("*")
                .gte("date", todayStart.toISOString())
                .order("date", { ascending: true }) as any);

            const live: any[] = [];
            data?.forEach((m: any) => {
                if (['live', 'IN_PLAY', 'PAUSED'].includes(m.status)) {
                    live.push({
                        ...m,
                        championshipName: championshipsMap[m.championship_id]?.name,
                        apiId: m.external_id
                    });
                }
            });
            setLiveMatches(live);
            activeMatchesRef.current = data || [];
            setLoading(false);
        };

        fetchLive();

        // Realtime listener for matches
        const channel = supabase
            .channel('debugger-matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchLive();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [championshipsMap]);


    // 2. Update Logic (From Context)
    const { isUpdating, logs, runUpdate } = useAdminUpdate();

    // Sync context logs to local logs for display
    useEffect(() => {
        setDebugLogs(logs);
    }, [logs]);

    const handleUpdateScores = async () => {
        setUpdating(true); // Local visual loading state if needed, though context has isUpdating
        await runUpdate();
        setUpdating(false);
    };

    return (
        <Card className="bg-slate-950 text-slate-200 border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        Debug de Atualização
                    </CardTitle>
                    {lastSystemUpdate && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 ml-6">
                            Última atualização do sistema: <span className="text-green-400 font-bold">{lastSystemUpdate.toLocaleTimeString()}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUpdateScores}
                        disabled={updating}
                        className="h-8 bg-slate-900 border-slate-700 hover:bg-slate-800 text-xs"
                    >
                        {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Forçar Atualização
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="text-xs font-mono space-y-4">
                <div>
                    <p className="mb-2 font-bold text-slate-400">Jogos Monitorados (Ao Vivo/Hoje): {liveMatches.length}</p>
                    <div className="max-h-40 overflow-y-auto bg-slate-900 p-2 rounded border border-slate-800">
                        {liveMatches.length > 0 ? liveMatches.map(m => {
                            const hasId = m.external_id || m.apiId;
                            return (
                                <div key={m.id} className="flex flex-col border-b border-slate-800 py-1 last:border-0 gap-1">
                                    <div className="flex justify-between">
                                        <span className="truncate max-w-[200px] font-bold text-white">{m.home_team} x {m.away_team}</span>
                                        <span className={hasId ? "text-green-400" : "text-red-400"}>
                                            {hasId ? `ID: ${m.external_id || m.apiId}` : "SEM VÍNCULO"}
                                        </span>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-slate-600">Nenhum jogo ao vivo encontrado.</p>}
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-2">
                    <p className="font-bold text-blue-400 mb-1">Logs de Execução:</p>
                    <div className="h-64 overflow-y-auto bg-black p-2 rounded border border-slate-800 text-[10px] text-green-500 font-mono leading-tight">
                        {debugLogs.length > 0 ? (
                            debugLogs.map((log, i) => (
                                <div key={i} className="whitespace-nowrap">{log}</div>
                            ))
                        ) : (
                            <span className="text-slate-500">Aguardando execução...</span>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-4">
                    <h3 className="text-sm font-bold text-amber-500 mb-2">Ferramentas de Migração (Legacy)</h3>
                    <div className="flex gap-2 mb-4">
                        <Button
                            onClick={async () => {
                                if (!confirm("Importar dados da Euro 2012?")) return;
                                setDebugLogs(prev => [...prev, "Iniciando importação Euro 2012..."]);
                                try {
                                    const res = await fetch("/api/admin/import-legacy", { method: "POST" });
                                    const data = await res.json();
                                    setDebugLogs(prev => [...prev, `Importação: ${data.message}`]);
                                } catch (e) {
                                    setDebugLogs(prev => [...prev, `Erro Importação: ${e}`]);
                                }
                            }}
                            size="sm"
                            className="bg-amber-900 border-amber-700 hover:bg-amber-800 text-amber-100"
                        >
                            Importar Euro 2012 (Teste)
                        </Button>

                        <Button
                            onClick={handleLoadLegacyForBanner}
                            size="sm"
                            variant="outline"
                            className="border-amber-700 text-amber-500 hover:bg-amber-950"
                        >
                            {legacyBannerMode ? "Fechar Gerador" : "Gerar Banner Euro 2012"}
                        </Button>
                    </div>

                    {legacyBannerMode && (
                        <div className="bg-slate-900 p-4 rounded border border-slate-700 animate-in slide-in-from-top-2">
                            <h4 className="font-bold text-white mb-4">Configurar Banner Euro 2012</h4>

                            <div className="mb-6 flex justify-center">
                                <div className="w-full max-w-[500px] shadow-2xl">
                                    <ChampionBanner
                                        championshipName="Eurocopa 2012"
                                        config={bannerConfig}
                                        winners={legacyWinners}
                                        teamMode="selecoes"
                                    />
                                </div>
                            </div>

                            <BannerConfigForm
                                config={bannerConfig}
                                onChange={setBannerConfig}
                                hasTies={legacyWinners.filter(w => w.position === 'champion').length > 1 || legacyWinners.filter(w => w.position === 'gold_winner').length > 1}
                            />

                            <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
                                <Button
                                    onClick={async () => {
                                        if (!confirm("Salvar e publicar banner na página Hall da Fama?")) return;
                                        try {
                                            // Euro 2012 ID hardcoded for this tool
                                            const champId = "uefa_euro_2012";

                                            const { error } = await (supabase
                                                .from("championships") as any)
                                                .upsert({
                                                    id: champId,
                                                    name: "Eurocopa 2012",
                                                    status: "finished",
                                                    created_at: new Date().toISOString(),
                                                    settings: {
                                                        bannerEnabled: true,
                                                        bannerConfig: bannerConfig,
                                                        manualWinners: legacyWinners,
                                                        teamMode: "selecoes",
                                                        category: "euro"
                                                    } as any
                                                });

                                            if (error) throw error;

                                            setDebugLogs(prev => [...prev, "Banner da Euro 2012 salvo e publicado no Hall da Fama!"]);
                                            alert("Banner Salvo! Verifique na página Hall da Fama.");

                                        } catch (e) {
                                            console.error("Erro ao salvar banner", e);
                                            alert("Erro ao salvar: " + e);
                                        }
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                >
                                    Salvar (Publicar no Hall)
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Ações de Banco de Dados</h4>
                        <Button
                            onClick={async () => {
                                if (!confirm("Importar tabela de jogos da Euro 2012?")) return;
                                setDebugLogs(prev => [...prev, "Iniciando importação de partidas..."]);
                                try {
                                    const res = await fetch("/api/admin/import-legacy?mode=matches", { method: "POST" });
                                    const data = await res.json();
                                    setDebugLogs(prev => [...prev, `Jogos: ${data.message}`]);
                                    alert(data.message);
                                } catch (e) {
                                    setDebugLogs(prev => [...prev, `Erro: ${e}`]);
                                    alert("Erro ao importar jogos");
                                }
                            }}
                            size="sm"
                            variant="secondary"
                            className="w-full border-slate-700 hover:bg-slate-800"
                        >
                            Importar Jogos Euro 2012 (Histórico)
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
