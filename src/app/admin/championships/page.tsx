"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trophy, Calendar, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function AdminChampionshipsPage() {
    const [championships, setChampionships] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchChampionships = async () => {
            try {
                const { data, error } = await supabase
                    .from("championships")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setChampionships(data || []);
            } catch (error) {
                console.error("Error fetching championships:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChampionships();
    }, [supabase]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const filteredChampionships = championships.filter(champ => {
        if (activeTab === "active") {
            return champ.status !== "arquivado";
        } else {
            return champ.status === "arquivado";
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Campeonatos</h1>
                <Link href="/admin/championships/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Campeonato
                    </Button>
                </Link>
            </div>

            <div className="flex items-center gap-4 border-b pb-2">
                <button
                    onClick={() => setActiveTab("active")}
                    className={`pb-2 text-sm font-medium transition-colors hover:text-primary ${activeTab === "active" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                >
                    Ativos
                </button>
                <button
                    onClick={() => setActiveTab("archived")}
                    className={`pb-2 text-sm font-medium transition-colors hover:text-primary ${activeTab === "archived" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                >
                    Arquivados
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChampionships.length > 0 ? (
                    filteredChampionships.map((champ) => (
                        <Link key={champ.id} href={`/admin/championships/${champ.id}`}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-bold truncate">{champ.name}</CardTitle>
                                    <Trophy className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {champ.category || "Geral"}
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Users className="mr-2 h-4 w-4" />
                                            {champ.settings?.participants?.length || 0} Participantes
                                        </div>
                                        <div className="pt-2">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${champ.status === "ativo" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
                                                champ.status === "arquivado" ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" :
                                                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                }`}>
                                                {champ.status === "ativo" ? "Ativo" :
                                                    champ.status === "arquivado" ? "Arquivado" :
                                                        "Finalizado"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        {activeTab === "active" ? "Nenhum campeonato ativo." : "Nenhum campeonato arquivado."}
                    </div>
                )}
            </div>
        </div>
    );
}
