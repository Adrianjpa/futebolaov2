"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Trophy, Swords, AlertCircle, History, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { format, addDays } from "date-fns";

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        newUsersMonth: 0,
        activeChamps: 0,
        pendingGames: 0,
        pendingApprovals: 0
    });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // 1. Total Users
            const { count: totalUsers } = await supabase
                .from("profiles")
                .select("*", { count: 'exact', head: true });

            // 2. New Users this Month (approx)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count: newUsers } = await supabase
                .from("profiles")
                .select("*", { count: 'exact', head: true })
                .gte("created_at", startOfMonth.toISOString());

            // 3. Active Championships
            const { count: activeChamps } = await supabase
                .from("championships")
                .select("*", { count: 'exact', head: true })
                .eq("status", "ativo");

            // 4. Pending Games (Next 7 days)
            const today = new Date();
            const nextWeek = addDays(today, 7);
            const { count: pendingGames } = await supabase
                .from("matches")
                .select("*", { count: 'exact', head: true })
                .gte("date", today.toISOString())
                .lte("date", nextWeek.toISOString())
                .neq("status", "finished");

            // 5. Pending Approvals
            const { count: pendingApprovals } = await supabase
                .from("profiles")
                .select("*", { count: 'exact', head: true })
                .eq("status", "pendente");

            setStats({
                totalUsers: totalUsers || 0,
                newUsersMonth: newUsers || 0,
                activeChamps: activeChamps || 0,
                pendingGames: pendingGames || 0,
                pendingApprovals: pendingApprovals || 0
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Visão Geral do Sistema</h1>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Usuários
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats.newUsersMonth} novos este mês
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Campeonatos Ativos
                        </CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeChamps}</div>
                        <p className="text-xs text-muted-foreground">
                            Em andamento
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Jogos Pendentes
                        </CardTitle>
                        <Swords className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingGames}</div>
                        <p className="text-xs text-muted-foreground">
                            Próximos 7 dias
                        </p>
                    </CardContent>
                </Card>
                <Card className={stats.pendingApprovals > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Aprovações Pendentes
                        </CardTitle>
                        <AlertCircle className={`h-4 w-4 ${stats.pendingApprovals > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.pendingApprovals > 0 ? "text-destructive" : ""}`}>{stats.pendingApprovals}</div>
                        <p className="text-xs text-muted-foreground">
                            Requer atenção
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm relative overflow-hidden group">
                    <History className="absolute -right-8 -bottom-8 h-32 w-32 text-blue-500/10 group-hover:text-blue-500/20 transition-all rotate-12" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <History className="h-5 w-5" />
                            Migração de Dados Legados
                        </CardTitle>
                        <CardDescription>
                            Vincule estatísticas históricas a usuários reais recém-cadastrados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/migrations/linker">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                                Abrir Ferramenta de Vínculo
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity or Quick Actions could go here */}
        </div>
    );
}
