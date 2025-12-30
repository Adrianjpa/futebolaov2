"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Trophy, Users, Gamepad2, Clock, Target, CheckCircle, Gem, XCircle, Goal, ArrowLeft, UserX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PublicProfilePage() {
    const { id } = useParams();
    const { profile: currentProfile } = useAuth();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    // Profile Data
    const [profileData, setProfileData] = useState<any>(null);

    // Stats State
    const [stats, setStats] = useState({
        totalPoints: 0,
        ranking: "-",
        totalPredictions: 0,
        championshipsDisputed: 0,
        titlesWon: 0
    });
    const [championships, setChampionships] = useState<any[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState("all");
    const [userPredictions, setUserPredictions] = useState<any[]>([]);

    const isAdmin = currentProfile?.funcao === "admin";

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!id) return;
            try {
                // 1. Fetch User Profile
                let { data: profile, error: profileError } = await (supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", id as string)
                    .single() as any);

                if (profileError || !profile) {
                    // Try public_profiles (email will be missing)
                    const { data: pubData } = await supabase
                        .from("public_profiles")
                        .select("*")
                        .eq("id", id as string)
                        .single();

                    if (!pubData) {
                        setLoading(false);
                        return;
                    }
                    profile = pubData as any;
                }

                setProfileData(profile);

                // 2. Fetch User Predictions
                const { data: predictions } = await supabase
                    .from("predictions")
                    .select("*")
                    .eq("user_id", id);

                const preds = predictions || [];
                setUserPredictions(preds);

                const uniqueChampionshipIds = Array.from(new Set(preds.map((p: any) => p.championship_id)));

                // 3. Fetch Championships Details
                if (uniqueChampionshipIds.length > 0) {
                    const { data: champs } = await supabase
                        .from("championships")
                        .select("*")
                        .in("id", uniqueChampionshipIds);
                    setChampionships(champs || []);
                }

                setStats({
                    totalPoints: profile?.total_points || 0,
                    ranking: "-",
                    totalPredictions: preds.length,
                    championshipsDisputed: uniqueChampionshipIds.length,
                    titlesWon: 0
                });

            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id, supabase]);

    const getFilteredStats = () => {
        let filteredPreds = userPredictions;
        if (selectedChampionship !== "all") {
            filteredPreds = userPredictions.filter((p: any) => p.championship_id === selectedChampionship);
        }

        const points = filteredPreds.reduce((acc, curr) => acc + (curr.points || 0), 0);
        const buchas = filteredPreds.filter((p: any) => p.points === 3).length;
        const situacao = filteredPreds.filter((p: any) => p.points === 1).length;
        const erros = filteredPreds.filter((p: any) => p.points === 0).length;

        return { points, buchas, situacao, combo: 0, bonus: 0, gols: 0, erros };
    };

    const filteredStats = getFilteredStats();

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!profileData) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <UserX className="h-12 w-12 mb-4" />
                <p>Usuário não encontrado.</p>
                <Button variant="link" asChild className="mt-4"><Link href="/dashboard">Voltar ao Início</Link></Button>
            </div>
        );
    }

    const displayName = profileData.nickname || profileData.nome || "Usuário sem nome";

    return (
        <div className="space-y-8">
            <div>
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/dashboard/ranking"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
                </Button>
            </div>

            <Card className="bg-card dark:bg-slate-950/50 border-border dark:border-slate-800 text-card-foreground overflow-hidden relative shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
                    <Trophy className="h-64 w-64 text-foreground dark:text-slate-700" />
                </div>
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background dark:border-slate-800 shadow-xl">
                        <AvatarImage src={profileData.foto_perfil} />
                        <AvatarFallback className="bg-muted dark:bg-slate-800 text-2xl font-bold">
                            {displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <h1 className="text-3xl font-bold">{displayName}</h1>
                        {profileData.nickname && <p className="text-muted-foreground text-sm">({profileData.nome})</p>}
                        {isAdmin && (
                            <p className="text-red-500 text-sm bg-red-500/10 w-fit px-2 py-1 rounded border border-red-500/20 mx-auto sm:mx-0 font-bold">
                                <User className="h-3 w-3 inline mr-1" /> {profileData.email} (Admin View)
                            </p>
                        )}
                        <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground mt-4">
                            <span className="flex items-center gap-1 font-medium">
                                <Clock className="h-3 w-3" /> Membro desde {new Date(profileData.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Informações Gerais</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoCard title="Títulos Conquistados" value={stats.titlesWon} icon={<Trophy className="text-yellow-500" />} />
                    <InfoCard title="Campeonatos Disputados" value={stats.championshipsDisputed} icon={<Users className="text-blue-500" />} />
                    <InfoCard title="Total de Palpites" value={stats.totalPredictions} icon={<Gamepad2 className="text-purple-500" />} />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Estatísticas por Campeonato</h2>
                    <div className="w-[250px]">
                        <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                            <SelectTrigger><SelectValue placeholder="Selecione um campeonato" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Campeonatos</SelectItem>
                                {championships.map((champ) => <SelectItem key={champ.id} value={champ.id}>{champ.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <StatCard title="Pontos" value={filteredStats.points} icon={<Gamepad2 className="h-4 w-4" />} color="bg-muted" text="text-foreground" description="Total de pontos no campeonato" />
                    <StatCard title="Buchas" value={filteredStats.buchas} icon={<Target className="h-4 w-4" />} color="bg-green-600" description="Placares cravados" />
                    <StatCard title="Situação" value={filteredStats.situacao} icon={<CheckCircle className="h-4 w-4" />} color="bg-blue-600" description="Vencedor/Empate corretos" />
                    <StatCard title="Combo" value={0} icon={<Gem className="h-4 w-4" />} color="bg-yellow-500" description="Bucha + Gols" />
                    <StatCard title="Bônus" value={0} icon={<Trophy className="h-4 w-4" />} color="bg-slate-300" text="text-slate-900" description="Situação + Gols" />
                    <StatCard title="Gols" value={0} icon={<Goal className="h-4 w-4" />} color="bg-purple-600" description="Acerto apenas nos gols" />
                    <StatCard title="Erros" value={filteredStats.erros} icon={<XCircle className="h-4 w-4" />} color="bg-red-600" description="Palpites sem pontuação" />
                </div>
            </div>
        </div>
    );
}

function InfoCard({ title, value, icon }: any) {
    return (
        <Card className="bg-card/50">
            <CardContent className="p-6 flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
                <div className="h-8 w-8 opacity-80">{icon}</div>
            </CardContent>
        </Card>
    );
}

function StatCard({ title, value, icon, color, description, text = "text-white" }: any) {
    return (
        <Card className={`${color} ${text} border-none`}>
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-medium opacity-80">{title}</span>
                        <span className="opacity-60">{icon}</span>
                    </div>
                    {description && <span className="text-[10px] leading-tight opacity-70 line-clamp-2">{description}</span>}
                </div>
                <span className="text-2xl font-bold mt-2">{value}</span>
            </CardContent>
        </Card>
    );
}
