"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase";
import { Crown, Medal, Trophy, Siren, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface UserProfile {
    user_id: string;
    nome: string;
    nickname?: string;
    foto_perfil?: string;
    total_points: number;
    exact_scores: number;
    outcomes: number;
    errors: number;
}

interface Championship {
    id: string;
    name: string;
    status: string;
}

export default function RankingPage() {
    const { user: currentUser } = useAuth();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const initialChampionshipId = searchParams.get("championship") || "all";

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState<string>(initialChampionshipId);
    const [sortBy, setSortBy] = useState<'total_points' | 'exact_scores' | 'outcomes'>('total_points');

    useEffect(() => {
        const fetchInitial = async () => {
            const { data: champs } = await (supabase.from("championships") as any).select("*").neq("status", "arquivado");
            setChampionships(champs || []);
            if (initialChampionshipId === "all" && champs && (champs as any[]).length > 0) {
                setSelectedChampionship((champs as any[])[0].id);
            }
        };
        fetchInitial();
    }, []);

    const fetchRanking = async () => {
        if (!selectedChampionship || selectedChampionship === "all") return;
        setLoading(true);
        try {
            // Consulta direta à View SQL (Muito mais performático)
            const { data, error } = await (supabase
                .from("ranking_by_championship") as any)
                .select("*")
                .eq("championship_id", selectedChampionship);

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching ranking:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRanking();

        // Escuta mudanças em tempo real na tabela de predictions
        // Se alguém mudar um palpite ou o Admin salvar um placar (que dispara o trigger de pontos),
        // a view de ranking será re-consultada.
        const channel = supabase
            .channel('ranking-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'predictions'
            }, () => {
                fetchRanking();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedChampionship]);

    const sortedUsers = [...users].sort((a, b) => {
        const valA = a[sortBy] || 0;
        const valB = b[sortBy] || 0;
        if (valA !== valB) return valB - valA;
        return b.total_points - a.total_points;
    });

    const getRankIcon = (index: number, total: number) => {
        if (index === 0) return <Crown className="h-6 w-6 text-yellow-500 animate-bounce" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
        if (index === total - 1 && total > 3) return <Siren className="h-6 w-6 text-red-600 animate-pulse" />;
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Ranking</h1>
                <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                    <SelectTrigger className="w-full sm:w-[260px]">
                        <SelectValue placeholder="Selecione um Campeonato" />
                    </SelectTrigger>
                    <SelectContent>
                        {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="border-b bg-muted/5 p-0">
                    <div className="flex items-center text-xs font-bold text-muted-foreground px-4 py-3 gap-2 uppercase tracking-wider">
                        <div className="w-8 text-center">Pos.</div>
                        <div className="flex-1">Jogador</div>
                        <HeaderItem label="Pontos" active={sortBy === 'total_points'} onClick={() => setSortBy('total_points')} />
                        <HeaderItem label="Buchas" active={sortBy === 'exact_scores'} onClick={() => setSortBy('exact_scores')} />
                        <HeaderItem label="Situação" active={sortBy === 'outcomes'} onClick={() => setSortBy('outcomes')} />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                    ) : sortedUsers.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">Ninguém pontuou ainda.</div>
                    ) : (
                        <div className="divide-y">
                            {sortedUsers.map((user, index) => (
                                <div key={user.user_id} className={`flex items-center px-4 py-3 gap-2 hover:bg-muted/30 transition-colors ${currentUser?.id === user.user_id ? "bg-primary/5 border-l-4 border-primary" : ""}`}>
                                    <div className="w-8 text-center font-bold text-muted-foreground">{index + 1}</div>
                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                        <Avatar className="h-10 w-10 border shrink-0">
                                            <AvatarImage src={user.foto_perfil} />
                                            <AvatarFallback>{(user.nickname || user.nome || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="truncate">
                                            <Link href={`/dashboard/profile/${user.user_id}`} className="hover:underline font-bold text-sm">
                                                {user.nickname || user.nome}
                                            </Link>
                                            <div className="flex items-center gap-2">{getRankIcon(index, sortedUsers.length)}</div>
                                        </div>
                                    </div>
                                    <StatValue value={user.total_points} active={sortBy === 'total_points'} />
                                    <StatValue value={user.exact_scores} active={sortBy === 'exact_scores'} />
                                    <StatValue value={user.outcomes} active={sortBy === 'outcomes'} />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function HeaderItem({ label, active, onClick }: any) {
    return (
        <div onClick={onClick} className={`w-16 text-center cursor-pointer hover:text-primary transition-colors ${active ? "text-primary border-b-2 border-primary" : ""}`}>
            {label}
        </div>
    );
}

function StatValue({ value, active }: any) {
    return (
        <div className={`w-16 text-center font-mono ${active ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}>
            {value}
        </div>
    );
}
