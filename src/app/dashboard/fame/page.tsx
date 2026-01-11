"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ChampionBanner } from "@/components/banner/ChampionBanner";
import { BannerConfig, BannerWinner, ChampionshipBannerData } from "@/types/banner";
import { Loader2, Calendar, Plus, Edit, Trash2, Trophy as TrophyIcon, UserPlus, Save, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogFooter, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BannerConfigForm } from "@/components/banner/BannerConfigForm";
import { UserSearch } from "@/components/admin/UserSearch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Extended type for fetched data
interface ArchivedChampionship {
    id: string;
    name: string;
    created_at: string;
    status: string;
    category?: string;
    bannerEnabled?: boolean;
    bannerConfig?: BannerConfig;
    manualWinners?: BannerWinner[];
    teamMode?: 'clubes' | 'selecoes' | 'mista';
}

export default function HallOfFamePage() {
    const { profile } = useAuth();
    const isAdmin = profile?.funcao === 'admin' || profile?.funcao === 'moderator';
    const [championships, setChampionships] = useState<ArchivedChampionship[]>([]);
    const [loading, setLoading] = useState(true);
    const [emblaRef] = useEmblaCarousel({ loop: true, align: "center", containScroll: "trimSnaps" }, [Autoplay({ delay: 6000, stopOnInteraction: false })]);
    const supabase = createClient();

    // Admin State for Add/Edit
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingChamp, setEditingChamp] = useState<ArchivedChampionship | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "geral",
        created_at: new Date().toISOString().split('T')[0],
        bannerConfig: {
            active: true,
            displayMode: 'photo_and_names' as any,
            titleColor: '#FFFFFF',
            subtitleColor: '#fbbf24',
            namesColor: '#FFFFFF',
            layoutStyle: 'modern' as any
        } as BannerConfig,
        manualWinners: [] as BannerWinner[]
    });

    const fetchFame = async () => {
        try {
            // Fetch all championships to check for banner settings
            const { data, error } = await (supabase
                .from("championships")
                .select("*")
                .order("created_at", { ascending: false }) as any);

            if (error) throw error;

            // Map and filter for banner enabled in settings
            const list = ((data as any[]) || [])
                .map(d => {
                    const settings = d.settings as any;
                    // Prioritize tournament end date from settings, fallback to record creation
                    const sortDate = settings?.data_fim || settings?.endDate || d.created_at;

                    return {
                        id: d.id,
                        name: d.name,
                        status: d.status,
                        category: d.category || "geral",
                        created_at: sortDate,
                        bannerEnabled: settings?.bannerEnabled || settings?.bannerConfig?.active || settings?.bannerConfig?.enabled,
                        bannerConfig: settings?.bannerConfig,
                        manualWinners: settings?.manualWinners || [],
                        teamMode: settings?.teamMode || 'clubes'
                    };
                })
                .filter(c => (c as any).bannerEnabled === true)
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setChampionships(list as ArchivedChampionship[]);
        } catch (error) {
            console.error("Error loading Hall of Fame:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFame();
    }, []);

    const handleSaveEntry = async () => {
        if (!formData.name) {
            alert("Nome é obrigatório!");
            return;
        }

        setSaving(true);
        try {
            const entryId = editingChamp?.id || crypto.randomUUID();
            const { error } = await (supabase
                .from("championships") as any)
                .upsert({
                    id: entryId,
                    name: formData.name,
                    category: formData.category,
                    created_at: new Date(formData.created_at).toISOString(),
                    status: editingChamp?.status || 'finalizado',
                    settings: {
                        bannerEnabled: true,
                        bannerConfig: formData.bannerConfig,
                        manualWinners: formData.manualWinners,
                        teamMode: editingChamp?.teamMode || 'clubes'
                    }
                });

            if (error) throw error;

            await fetchFame();
            setIsDialogOpen(false);
            setEditingChamp(null);
            setFormData({
                name: "",
                category: "geral",
                created_at: new Date().toISOString().split('T')[0],
                bannerConfig: {
                    active: true,
                    displayMode: 'photo_and_names',
                    titleColor: '#FFFFFF',
                    subtitleColor: '#fbbf24',
                    namesColor: '#FFFFFF',
                    layoutStyle: 'modern'
                },
                manualWinners: []
            });
        } catch (error: any) {
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este registro do Hall da Fama?")) return;
        try {
            const { error } = await (supabase.from("championships") as any).delete().eq("id", id);
            if (error) throw error;
            setChampionships(prev => prev.filter((c: ArchivedChampionship) => c.id !== id));
        } catch (error: any) {
            alert(`Erro ao excluir: ${error.message}`);
        }
    };

    const handleEdit = (champ: ArchivedChampionship) => {
        setEditingChamp(champ);
        setFormData({
            name: champ.name,
            category: champ.category || "geral",
            created_at: new Date(champ.created_at).toISOString().split('T')[0],
            bannerConfig: champ.bannerConfig || {
                active: true,
                displayMode: 'photo_and_names',
                titleColor: '#FFFFFF',
                subtitleColor: '#fbbf24',
                namesColor: '#FFFFFF',
                layoutStyle: 'modern'
            },
            manualWinners: champ.manualWinners || []
        });
        setIsDialogOpen(true);
    };

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">🏆 Hall da Fama</h1>
                    <p className="text-muted-foreground text-sm">
                        A glória eterna dos campeões do FuteBolão.
                    </p>
                </div>

                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) { setEditingChamp(null); }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-md border-0 group">
                                <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                                <span className="hidden sm:inline">Novo Registro Manual</span>
                                <span className="sm:hidden">Novo</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <TrophyIcon className="h-5 w-5 text-amber-500" />
                                    {editingChamp ? "Editar Registro" : "Novo Registro no Hall da Fama"}
                                </DialogTitle>
                                <DialogDescription>
                                    Crie um banner manual para campeonatos passados ou informativos.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Nome do Campeonato</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: Eurocopa 2012"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Categoria (Agrupamento)</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="geral">Geral</SelectItem>
                                                <SelectItem value="copa">Copa do Mundo</SelectItem>
                                                <SelectItem value="euro">Eurocopa</SelectItem>
                                                <SelectItem value="brasileirao">Brasileirão</SelectItem>
                                                <SelectItem value="champions">Champions League</SelectItem>
                                                <SelectItem value="outros">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Data de Encerramento</Label>
                                        <Input
                                            type="date"
                                            value={formData.created_at}
                                            onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Adicionar Vencedores</Label>
                                        <UserSearch
                                            onSelect={(user: any) => {
                                                const exists = formData.manualWinners.find((w: BannerWinner) => w.userId === user.id);
                                                if (!exists) {
                                                    setFormData({
                                                        ...formData,
                                                        manualWinners: [...formData.manualWinners, {
                                                            userId: user.id,
                                                            displayName: user.nickname || user.nome,
                                                            photoUrl: user.foto_perfil || "",
                                                            position: 'champion'
                                                        }]
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Winners List */}
                                {formData.manualWinners.length > 0 && (
                                    <div className="bg-muted/50 p-3 rounded-lg border">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold mb-2 block">Vencedores Configurados</Label>
                                        <div className="space-y-2">
                                            {formData.manualWinners.map((winner: BannerWinner, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between bg-card p-2 rounded border shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={winner.position === 'champion' ? 'default' : 'secondary'} className="text-[10px]">
                                                            {winner.position === 'champion' ? 'Campeão' : 'Gold'}
                                                        </Badge>
                                                        <span className="text-sm font-medium">{winner.displayName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => {
                                                                const newList = [...formData.manualWinners];
                                                                newList[idx].position = newList[idx].position === 'champion' ? 'gold_winner' : 'champion';
                                                                setFormData({ ...formData, manualWinners: newList });
                                                            }}
                                                        >
                                                            <TrophyIcon className={cn("h-4 w-4", winner.position === 'champion' ? "text-yellow-600" : "text-slate-400")} />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-red-500 hover:text-red-600"
                                                            onClick={() => {
                                                                const newList = formData.manualWinners.filter((_, i) => i !== idx);
                                                                setFormData({ ...formData, manualWinners: newList });
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <Label className="text-lg font-bold">Design do Banner</Label>
                                    <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900">
                                        <ChampionBanner
                                            championshipName={formData.name || "Prévia"}
                                            config={formData.bannerConfig}
                                            winners={formData.manualWinners}
                                            className="w-full shadow-md max-w-[400px] mx-auto mb-4"
                                            teamMode={editingChamp?.teamMode || 'clubes'}
                                        />
                                        <BannerConfigForm
                                            config={formData.bannerConfig}
                                            onChange={(cfg: BannerConfig) => setFormData({ ...formData, bannerConfig: cfg })}
                                            hasTies={formData.manualWinners.filter((w: BannerWinner) => w.position === 'champion').length > 1}
                                            showInfoField={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveEntry} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    {editingChamp ? "Salvar Alterações" : "Publicar no Hall"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {championships.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                    <div className="bg-yellow-100 p-4 rounded-full mb-4">
                        <Calendar className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Salão Vazio</h2>
                    <p className="text-muted-foreground max-w-md">
                        Ainda não temos campeonatos finalizados no Hall da Fama.
                        Participe e seja o primeiro a colocar seu nome aqui!
                    </p>
                </div>
            ) : (
                /* Embla Carousel Viewport */
                <div className="overflow-hidden p-1 -m-1" ref={emblaRef}>
                    <div className="flex gap-6 touch-pan-y">
                        {championships.map((champ: ArchivedChampionship) => {
                            // Prepare winners list (Manual Override OR Automatic Logic placeholder)
                            const winners = champ.manualWinners || [];

                            // Defensive Check: ensure we have rudimentary config object
                            const config = champ.bannerConfig || {
                                active: true,
                                displayMode: 'photo_and_names',
                                titleColor: '#fff',
                                subtitleColor: '#fbbf24',
                                namesColor: '#fff'
                            };

                            return (
                                <div key={champ.id} className="flex-[0_0_92%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] xl:flex-[0_0_25%] pb-4">
                                    <div className="relative group">
                                        <Dialog>
                                            <DialogTrigger className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98] outline-none">
                                                <ChampionBanner
                                                    championshipName={champ.name}
                                                    config={config as BannerConfig}
                                                    winners={winners as BannerWinner[]}
                                                    teamMode={champ.teamMode}
                                                    className="w-full shadow-lg"
                                                />
                                            </DialogTrigger>
                                            <DialogContent className="max-w-[95vw] md:max-w-[85vw] w-full lg:max-w-[750px] p-0 border-none bg-transparent shadow-none" aria-describedby={undefined}>
                                                <DialogTitle className="sr-only">
                                                    Banner do Campeonato: {champ.name}
                                                </DialogTitle>
                                                <ChampionBanner
                                                    championshipName={champ.name}
                                                    config={config as BannerConfig}
                                                    winners={winners as BannerWinner[]}
                                                    className="w-full shadow-2xl"
                                                    teamMode={champ.teamMode}
                                                />
                                            </DialogContent>
                                        </Dialog>

                                        {/* Admin Quick Actions */}
                                        {isAdmin && (
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-8 w-8 scale-90 shadow-md"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(champ);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-8 w-8 scale-90 shadow-md"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(champ.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center mt-3">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <p className="font-semibold text-sm leading-none">{champ.name}</p>
                                            <Badge variant="outline" className="text-[9px] h-4 font-normal px-1 opacity-60 uppercase">{champ.category}</Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
