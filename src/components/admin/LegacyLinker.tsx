
"use client";

import { useState, useEffect } from "react";
import { UserSearch } from "./UserSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { ArrowRight, Link as LinkIcon, AlertCircle, CheckCircle } from "lucide-react";

export function LegacyLinker() {
    const [legacyRecords, setLegacyRecords] = useState<any[]>([]);
    const [selectedLegacy, setSelectedLegacy] = useState<any | null>(null);
    const [targetUser, setTargetUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const supabase = createClient();

    const [viewMode, setViewMode] = useState<'unlinked' | 'linked'>('unlinked');

    // Fetch Records based on mode
    const fetchRecords = async () => {
        setLoading(true);
        try {
            let query = (supabase.from("legacy_stats") as any).select("*");

            if (viewMode === 'unlinked') {
                query = query.is("user_id", null);
            } else {
                query = query.not("user_id", "is", null);
            }

            const { data, error } = await (query.order("rank", { ascending: true }) as any);

            if (error) throw error;
            setLegacyRecords((data || []) as any[]);
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
        if (!confirm(`Tem certeza que deseja vincular ${selectedLegacy.legacy_user_name} a ${targetUser.nome || targetUser.nickname}?`)) return;

        setLoading(true);
        try {
            const res = await fetch("/api/admin/link-legacy", {
                method: "POST",
                body: JSON.stringify({
                    legacyDocId: selectedLegacy.id,
                    realUserId: targetUser.id,
                    championshipId: selectedLegacy.championship_id || "uefa_euro_2012"
                })
            });
            const result = await res.json();

            if (result.success) {
                setMessage(`Sucesso: ${result.message}`);
                // Remove from list
                setLegacyRecords(prev => prev.filter(r => r.id !== selectedLegacy.id));
                setSelectedLegacy(null);
                setTargetUser(null);
            } else {
                alert("Erro: " + result.error);
            }
        } catch (e) {
            alert("Erro ao validar: " + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Legacy Records */}
            <Card className="h-[600px] flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        Registros Legados
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                        <Button
                            variant={viewMode === 'unlinked' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode('unlinked')}
                            className="text-xs"
                        >
                            Abertos
                        </Button>
                        <Button
                            variant={viewMode === 'linked' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode('linked')}
                            className="text-xs"
                        >
                            Já Vinculados
                        </Button>
                    </div>
                    <CardDescription>Selecione um registro histórico abaixo.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-2 p-2">
                    {loading && <p className="text-sm text-center">Carregando...</p>}
                    {!loading && legacyRecords.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                            <p>Todos os registros foram vinculados!</p>
                        </div>
                    )}
                    {legacyRecords.map((record: any) => (
                        <div
                            key={record.id}
                            onClick={() => setSelectedLegacy(record)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center ${selectedLegacy?.id === record.id ? "bg-blue-500/10 border-blue-500" : "hover:bg-muted border-border"}`}
                        >
                            <div>
                                <h4 className="font-bold text-sm">{record.legacy_user_name}</h4>
                                <p className="text-xs text-muted-foreground">{record.championship_name} ({record.year})</p>
                            </div>
                            <div className="text-right">
                                <Badge variant="secondary" className="mb-1">#{record.rank}</Badge>
                                <p className="text-xs font-mono">{record.points} pts</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Right Column: Linker Interface */}
            <Card className="h-[600px] flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-blue-500" />
                        Vincular a Usuário Real
                    </CardTitle>
                    <CardDescription>Selecione o usuário de destino para os dados.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center space-y-6">
                    {message && (
                        <div className="bg-green-500/10 text-green-600 p-3 rounded-lg text-sm mb-4 border border-green-500/20">
                            {message}
                        </div>
                    )}

                    {selectedLegacy ? (
                        <div className="space-y-6">
                            <div className="bg-muted p-4 rounded-lg border text-center">
                                <p className="text-xs text-muted-foreground uppercase mb-1">Origem (Legacy)</p>
                                <h3 className="text-2xl font-bold">{selectedLegacy.legacy_user_name}</h3>
                                <div className="flex justify-center gap-4 mt-2 text-sm">
                                    <span>🏆 {recordTitle(selectedLegacy.rank)}</span>
                                    <span>📊 {selectedLegacy.points} pts</span>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <ArrowRight className="h-8 w-8 text-muted-foreground animate-pulse" />
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Destino (Usuário Real):</p>
                                <UserSearch onSelect={setTargetUser} />
                                {targetUser && (
                                    <div className="mt-2 bg-blue-500/10 border border-blue-500/30 p-3 rounded flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                                            {targetUser.foto_perfil && <img src={targetUser.foto_perfil} className="h-full w-full object-cover" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{targetUser.nome || targetUser.nickname}</p>
                                            <p className="text-xs text-muted-foreground">{targetUser.email}</p>
                                        </div>
                                        <CheckCircle className="ml-auto h-5 w-5 text-green-500" />
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleLink}
                                disabled={!targetUser || loading}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? "Vinculando..." : "Confirmar Vínculo"}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <ArrowRight className="h-10 w-10 mx-auto mb-4 opacity-20" />
                            <p>Selecione um registro à esquerda para começar.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function recordTitle(rank: number) {
    if (rank === 1) return "Campeão";
    if (rank === 2) return "Vice";
    if (rank === 3) return "Bronze";
    return `${rank}º Lugar`;
}
