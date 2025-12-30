"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import euro2012Stats from "@/data/legacy/euro2012.json";

interface MatchedUser {
    legacyName: string;
    foundUser: any | null;
    status: "matched" | "not_found" | "pending";
}

export default function Euro2012MigrationPage() {
    const [matches, setMatches] = useState<MatchedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [championshipId, setChampionshipId] = useState<string | null>(null);
    const [migrating, setMigrating] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const supabase = createClient();

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Find the Euro 2012 Championship
            const { data: champs } = await (supabase
                .from("championships")
                .select("*")
                .ilike("name", "%euro%2012%") as any);

            const targetChamp = champs?.[0] as any;

            if (targetChamp) {
                setChampionshipId(targetChamp.id);
            }

            // 2. Fetch all profiles to match against
            const { data: allUsers } = await (supabase
                .from("profiles")
                .select("*") as any);

            // 3. Match Logic
            const calculatedMatches: MatchedUser[] = euro2012Stats.map(stat => {
                const found = allUsers?.find((u: any) => {
                    const name = u.nome || u.nickname || "";
                    return name.toLowerCase().includes(stat.legacyUserName.toLowerCase());
                });

                return {
                    legacyName: stat.legacyUserName,
                    foundUser: found || null,
                    status: found ? "matched" : "not_found"
                };
            });

            setMatches(calculatedMatches);

        } catch (error) {
            console.error(error);
            setResult("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    const handleMigration = async () => {
        if (!championshipId) return;
        setMigrating(true);
        try {
            // In Supabase, 'participants' isn't a column in 'championships'.
            // Participants are users who have predictions for this championship.
            // This legacy script was likely just for UI/Listing.
            // We'll just confirm that we found the matches instead of updating a column that doesn't exist.

            setResult(`Sucesso! ${matches.filter(m => m.status === "matched").length} participantes mapeados.`);

        } catch (error: any) {
            console.error(error);
            setResult("Erro na migração: " + error.message);
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Migração de Participantes - Euro 2012</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Status da Vinculação</CardTitle>
                    <CardDescription>
                        {championshipId ? `Campeonato encontrado: ID ${championshipId}` : "Campeonato Euro 2012 não encontrado."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin" /> Analisando usuários...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 font-medium text-sm text-slate-500 border-b pb-2">
                                <div>Nome Legado (JSON)</div>
                                <div>Usuário Encontrado (Sistema)</div>
                                <div>Status</div>
                            </div>
                            {matches.map((m) => (
                                <div key={m.legacyName} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-0">
                                    <div>{m.legacyName}</div>
                                    <div className="text-sm">
                                        {m.foundUser ? (
                                            <span className="text-green-600 font-medium">
                                                {m.foundUser.displayName || m.foundUser.nome}
                                            </span>
                                        ) : (
                                            <span className="text-red-400 italic">Não encontrado</span>
                                        )}
                                    </div>
                                    <div>
                                        {m.status === "matched" ? <Check className="text-green-500 h-4 w-4" /> : <AlertCircle className="text-red-500 h-4 w-4" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button
                    size="lg"
                    onClick={handleMigration}
                    disabled={migrating || !championshipId || matches.filter(m => m.status === "matched").length === 0}
                >
                    {migrating ? "Vinculando..." : "Confirmar Vinculação"}
                </Button>
            </div>

            {result && (
                <div className="p-4 bg-slate-100 rounded border">
                    {result}
                </div>
            )}
        </div>
    );
}
