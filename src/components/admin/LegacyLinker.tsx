"use client";

import { useState, useEffect } from "react";
import { UserSearch } from "./UserSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Link as LinkIcon, AlertCircle, CheckCircle, RefreshCcw, Search, UserMinus, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function LegacyLinker() {
    const [legacyRecords, setLegacyRecords] = useState<any[]>([]);
    const [selectedLegacy, setSelectedLegacy] = useState<any | null>(null);
    const [targetUser, setTargetUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const supabase = createClient();

    const [viewMode, setViewMode] = useState<'unlinked' | 'linked'>('unlinked');

    const [totalCount, setTotalCount] = useState(0);

    // Fetch Records based on mode
    const fetchRecords = async () => {
        setLoading(true);
        try {
            console.log("Fetching legacy profiles (.local)...");
            // Now we look into PROFILES for users with .local email
            const { data, error, count } = await (supabase.from("profiles") as any)
                .select("*", { count: 'exact' })
                .ilike("email", "%.local")
                .order("nome", { ascending: true });

            if (error) throw error;
            console.log("Legacy profiles found:", data?.length);
            setLegacyRecords((data || []) as any[]);
            setTotalCount(count || 0);
        } catch (e) {
            console.error("Error fetching legacy:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [viewMode]);

    const handleLink = async () => {
        if (!selectedLegacy || !targetUser) return;
        if (!confirm(`Confirmar vínculo: Transferir TODO o histórico de "${selectedLegacy.nome || selectedLegacy.nickname}" para a conta real "${targetUser.nome || targetUser.nickname}"?`)) return;

        setLoading(true);
        try {
            const res = await fetch("/api/admin/link-legacy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceUserId: selectedLegacy.id, // The .local user
                    targetUserId: targetUser.id,   // The real user
                })
            });
            const result = await res.json();

            if (result.success) {
                setMessage(`Vínculo realizado com sucesso! O histórico foi migrado.`);
                setLegacyRecords(prev => prev.filter(r => r.id !== selectedLegacy.id));
                setSelectedLegacy(null);
                setTargetUser(null);

                setTimeout(() => setMessage(null), 5000);
            } else {
                alert("Erro: " + result.error);
            }
        } catch (e) {
            alert("Erro ao processar: " + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div>
                    <h3 className="font-bold text-lg">Gerenciador de Vínculos</h3>
                    <p className="text-sm text-muted-foreground">Associe contas legadas (.local) a contas reais do sistema.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRecords}
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Atualizar Lista
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Legacy Records */}
                <Card className="lg:col-span-5 flex flex-col min-h-[500px] shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/10">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                1. Contas Legadas (.local)
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs">Selecione o usuário antigo para herdar os dados.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading && legacyRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <RefreshCcw className="h-6 w-6 animate-spin mb-2 opacity-20" />
                                <p className="text-xs">Carregando usuários...</p>
                            </div>
                        ) : legacyRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-60 text-center space-y-2 p-6">
                                <Search className="h-10 w-10 text-muted-foreground mb-2 opacity-20" />
                                <h4 className="font-bold text-sm">Nenhuma conta legado encontrada</h4>
                                <p className="text-xs text-muted-foreground px-4">
                                    Não encontramos usuários com email ending em <strong className="text-primary">.local</strong> no sistema.
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-2 italic px-6">
                                    Dica: Vá em "Gerenciar Usuários" e verifique se os emails terminam exatamente com .local
                                </p>
                            </div>
                        ) : (
                            legacyRecords.map((record: any) => (
                                <div
                                    key={record.id}
                                    onClick={() => setSelectedLegacy(record)}
                                    className={cn(
                                        "p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1",
                                        selectedLegacy?.id === record.id
                                            ? "bg-primary/5 border-primary shadow-md"
                                            : "bg-card border-transparent hover:border-border hover:bg-muted/50 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-bold font-mono">
                                            {(record.nome || record.nickname)?.[0] || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm truncate">{record.nome || record.nickname}</h4>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-2.5 w-2.5" /> {record.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Center / Right Section */}
                <Card className="lg:col-span-7 flex flex-col shadow-lg border-2 border-border/10">
                    <CardHeader className="pb-3 border-b bg-primary/5">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-primary" />
                            2. Usuário Real (Gmail/Normal)
                        </CardTitle>
                        <CardDescription className="text-xs">Escolha a conta que vai RECEBER o histórico.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-6">
                        {message && (
                            <div className="animate-in fade-in slide-in-from-top-2 bg-emerald-500/10 text-emerald-600 p-4 rounded-xl text-sm mb-6 border border-emerald-500/20 flex items-center gap-3 font-medium">
                                <CheckCircle className="h-5 w-5" />
                                {message}
                            </div>
                        )}

                        {!selectedLegacy ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-50 grayscale">
                                <ArrowRight className="h-16 w-16 mb-4 text-muted-foreground rotate-90 lg:rotate-0" />
                                <h4 className="font-bold text-lg">Selecione uma conta à esquerda</h4>
                                <p className="text-sm max-w-[250px]">Escolha primeiro quem era o usuário no antigo sistema.</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
                                {/* Transfer Visualizer */}
                                <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                    <div className="bg-muted/50 p-6 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-center relative overflow-hidden">
                                        <Badge className="absolute -top-1 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px]">DE (ANTIGO)</Badge>
                                        <h3 className="text-lg font-black truncate mt-1">{selectedLegacy.nome || selectedLegacy.nickname}</h3>
                                        <p className="text-[10px] text-muted-foreground truncate">{selectedLegacy.email}</p>
                                    </div>

                                    <div className="flex justify-center flex-col items-center gap-1">
                                        <ArrowRight className="h-8 w-8 text-primary animate-pulse rotate-90 md:rotate-0" />
                                        <span className="text-[9px] font-black text-muted-foreground">TRANSFERIR PARA</span>
                                    </div>

                                    <div className={cn(
                                        "p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative min-h-[100px]",
                                        targetUser ? "bg-emerald-500/5 border-emerald-500 shadow-md" : "bg-muted/20 border-border border-dashed"
                                    )}>
                                        <Badge className="absolute -top-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px]">PARA (NOVO)</Badge>
                                        {targetUser ? (
                                            <>
                                                <h3 className="text-lg font-black truncate max-w-full">{targetUser.nickname || targetUser.nome}</h3>
                                                <p className="text-[9px] text-muted-foreground truncate">{targetUser.email}</p>
                                            </>
                                        ) : (
                                            <>
                                                <Search className="h-6 w-6 text-muted-foreground mb-1 opacity-20" />
                                                <p className="text-[10px] font-bold text-muted-foreground italic">Nenhum escolhido</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Selection Area */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Search className="h-3 w-3" /> Buscar Conta Real (Destino)
                                        </label>
                                        <UserSearch onSelect={setTargetUser} />
                                    </div>

                                    <div className="pt-4 mt-auto">
                                        <Button
                                            onClick={handleLink}
                                            disabled={!targetUser || loading}
                                            className="w-full h-14 text-base font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl transition-all hover:scale-[1.02]"
                                        >
                                            {loading ? <RefreshCcw className="h-5 w-5 animate-spin mr-2" /> : <LinkIcon className="h-5 w-5 mr-3" />}
                                            {loading ? "Processando..." : "Confirmar Migração de Dados"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
