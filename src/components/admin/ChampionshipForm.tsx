import { useRef, useState, useEffect } from "react";
import { Check, ChevronsUpDown, X, Settings, BookOpen, Shield, Users, Trophy, Image as ImageIcon, AlertCircle, Upload, Calendar as CalendarIcon, Save, Loader2, Plus, Award } from "lucide-react";
import { createClient } from "@/lib/supabase";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChampionBanner } from "@/components/banner/ChampionBanner";
import { BannerConfigForm } from "@/components/banner/BannerConfigForm";
import { BannerConfig, BannerWinner } from "@/types/banner";
import { UserSearch } from "@/components/admin/UserSearch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ... (rest of imports/schemas/components until generic component start)
function TeamSelectorItems({ supabase, selectedTeamIds = [] }: { supabase: any, selectedTeamIds?: string[] }) {
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        const fetchTeams = async () => {
            const { data } = await supabase.from("teams").select("*").order("name", { ascending: true });
            setTeams(data || []);
        };
        fetchTeams();
    }, [supabase]);

    const availableTeams = teams.filter(t => !selectedTeamIds.includes(t.id));

    if (availableTeams.length === 0) {
        return <div className="p-2 text-xs text-muted-foreground text-center">Todas as equipes disponíveis já foram adicionadas.</div>;
    }

    return (
        <>
            {availableTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                        {t.shield_url && <img src={t.shield_url} className="h-4 w-4 object-contain" />}
                        <span>{t.name}</span>
                    </div>
                </SelectItem>
            ))}
        </>
    );
}

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    iconUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    startDate: z.date(),
    endDate: z.date(),
    startDateInput: z.string().optional(),
    endDateInput: z.string().optional(),
    type: z.enum(["liga", "copa", "avulso"]),
    category: z.string().default("other"),
    teamMode: z.enum(["clubes", "selecoes", "mista"]),
    // Rules
    ghostPlayer: z.boolean().default(false),
    selectionSlots: z.coerce.number().min(0).default(3).optional(),
    enableSelectionPriority: z.boolean().default(false),
    // Scoring
    exactScorePoints: z.coerce.number().min(0).default(3),
    winnerPoints: z.coerce.number().min(0).default(1),
    comboEnabled: z.boolean().default(false),
    bonusPoints: z.coerce.number().min(0).default(2).optional(),
    comboPoints: z.coerce.number().min(0).default(5).optional(),
    // Banner
    bannerEnabled: z.boolean().default(false),
    bannerConfig: z.object({
        championshipLogoUrl: z.string().optional(),
        backgroundUrl: z.string().optional(),
        titleColor: z.string().default("#FFFFFF"),
        subtitleColor: z.string().default("#FBBF24"),
        namesColor: z.string().default("#FFFFFF"),
        displayMode: z.enum(["photo_and_names", "names_only"]).default("photo_and_names"),
        layoutStyle: z.enum(["modern", "classic"]).default("modern"),
        backgroundScale: z.number().default(100),
        backgroundPosX: z.number().default(50),
        backgroundPosY: z.number().default(50),
        customFontSizeOffset: z.number().default(0),
        selectionMode: z.enum(["auto", "manual"]).default("manual"),
    }).optional(),
    manualWinners: z.array(z.object({
        userId: z.string(),
        displayName: z.string(),
        photoUrl: z.string().nullable().optional(),
        position: z.enum(['champion', 'gold_winner', 'silver_winner', 'bronze_winner', 'auto']),
    })).optional(),
    participants: z.array(z.object({
        userId: z.string(),
        displayName: z.string(),
        photoUrl: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
    })).default([]),
    // API Integration
    creationType: z.enum(["manual", "hybrid", "auto"]),
    apiCode: z.string().optional(),
    status: z.enum(["rascunho", "agendado", "ativo", "finished", "arquivado"]).default("rascunho"),
    officialRanking: z.array(z.string()).default(["", "", "", "", ""]),
    teams: z.array(z.object({
        id: z.string(),
        name: z.string(),
        shieldUrl: z.string().nullable().optional()
    })).default([]),
    apiScoreType: z.enum(["fullTime", "regularTime"]).default("fullTime"),
});

export type ChampionshipFormData = z.infer<typeof formSchema>;

interface ChampionshipFormProps {
    initialData?: Partial<ChampionshipFormData>;
    onSubmit: (values: ChampionshipFormData) => Promise<void>;
    isSubmitting?: boolean;
    submitLabel?: string;
}

export function ChampionshipForm({ initialData, onSubmit, isSubmitting = false, submitLabel = "Salvar" }: ChampionshipFormProps) {
    const supabase = createClient();
    const form = useForm<ChampionshipFormData>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: initialData?.name || "",
            iconUrl: initialData?.iconUrl || (initialData as any)?.icon_url || "",
            startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
            endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
            startDateInput: initialData?.startDate ? format(new Date(initialData.startDate), "dd/MM/yyyy") : "",
            endDateInput: initialData?.endDate ? format(new Date(initialData.endDate), "dd/MM/yyyy") : "",
            type: initialData?.type || "copa",
            category: initialData?.category || "other",
            teamMode: initialData?.teamMode || "selecoes",
            ghostPlayer: initialData?.ghostPlayer ?? false,
            selectionSlots: initialData?.selectionSlots ?? 3,
            enableSelectionPriority: initialData?.enableSelectionPriority ?? false,
            exactScorePoints: initialData?.exactScorePoints ?? 3,
            winnerPoints: initialData?.winnerPoints ?? 1,
            comboEnabled: initialData?.comboEnabled ?? false,
            bonusPoints: initialData?.bonusPoints ?? 2,
            comboPoints: initialData?.comboPoints ?? 5,
            bannerEnabled: initialData?.bannerEnabled ?? false,
            bannerConfig: initialData?.bannerConfig || {
                active: false,
                displayMode: 'photo_and_names',
                titleColor: '#FFFFFF',
                subtitleColor: '#fbbf24',
                namesColor: '#FFFFFF',
                layoutStyle: 'modern',
                backgroundScale: 100,
                backgroundPosX: 50,
                backgroundPosY: 50,
                customFontSizeOffset: 0,
                selectionMode: 'manual'
            },
            manualWinners: initialData?.manualWinners || [],
            participants: (initialData?.participants || []).map((p: any) => ({
                userId: p.userId || p.user_id,
                displayName: p.displayName || p.display_name,
                photoUrl: p.photoUrl || p.photo_url || null,
                email: p.email || null
            })),
            creationType: initialData?.creationType || "manual",
            apiCode: initialData?.apiCode || "",
            status: (initialData?.status as any) === "ativo" ? "ativo" : (initialData?.status as any) === "finalizado" ? "finished" : (initialData?.status as any) === "agendado" ? "agendado" : (initialData?.status || "rascunho") as any,
            officialRanking: initialData?.officialRanking || ["", "", "", "", ""],
            teams: (initialData?.teams || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                shieldUrl: t.shieldUrl || t.shield_url || null
            })),
            apiScoreType: initialData?.apiScoreType || "fullTime",
        } as any,
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [quickTeam, setQuickTeam] = useState({ name: "", shortName: "", shieldUrl: "", type: "national" as "club" | "national" });
    const [duplicateTeam, setDuplicateTeam] = useState<any>(null);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);

    const participants = form.watch("participants") || [];
    const manualWinners = form.watch("manualWinners") || [];

    const logoInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'background') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            if (type === 'icon') {
                form.setValue("iconUrl", publicUrl, { shouldDirty: true });
            } else {
                form.setValue("bannerConfig.backgroundUrl", publicUrl, { shouldDirty: true });
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Erro ao fazer upload da imagem.");
        } finally {
            setIsUploading(false);
            if (event.target) event.target.value = '';
        }
    };

    // Helper to add manual winner
    const addManualWinner = (user: any, position: 'champion' | 'gold_winner' | 'silver_winner' | 'bronze_winner') => {
        const current = form.getValues("manualWinners") || [];
        // Prevent duplicates
        if (current.some(w => w.userId === user.id && w.position === position)) return;

        const newWinner = {
            userId: user.id,
            displayName: user.nickname || user.nome,
            photoUrl: user.foto_perfil || "",
            position
        };
        form.setValue("manualWinners", [...current, newWinner]);
    };

    const removeManualWinner = (userId: string, position: string) => {
        const current = form.getValues("manualWinners") || [];
        form.setValue("manualWinners", current.filter(w => !(w.userId === userId && w.position === position)));
    };

    const handleAutoFillWinners = async () => {
        setIsAutoFilling(true);
        try {
            const champId = (initialData as any)?.id;
            if (!champId) {
                alert("Salve o campeonato primeiro para calcular os vencedores.");
                return;
            }

            console.log("🏆 Calculando vencedores automáticos...");

            // 1. Fetch Ranking de Pontos direto do banco
            const { data: rankingData, error: rankingError } = await supabase
                .from("ranking_by_championship")
                .select("*")
                .eq("championship_id", champId);

            if (rankingError) throw rankingError;

            if (!rankingData || rankingData.length === 0) {
                alert("Nenhum palpite computado ainda para este campeonato no ranking oficial.");
                return;
            }

            // 2. Determinar Campeão Geral (Top 1)
            const maxPoints = Math.max(...rankingData.map((u: any) => u.total_points || 0));
            const pointChampions = rankingData.filter((u: any) => u.total_points === maxPoints);

            console.log(`🥇 Campeão(ões) com ${maxPoints} pts:`, pointChampions.map((c: any) => c.nickname));

            // 3. Determinar Palpiteiro de Ouro (Highlander)
            const officialRanking = (form.getValues("officialRanking") as string[]) || [];
            const isRankingReady = officialRanking.some(r => r && r !== "");

            let goldWinners: any[] = [];
            if (isRankingReady) {
                console.log("🌟 Calculando Palpiteiro de Ouro com ranking oficial:", officialRanking);

                // Tenta buscar da tabela vinculada
                let { data: allPartsSelections } = await supabase
                    .from("championship_participants")
                    .select("user_id, team_selections")
                    .eq("championship_id", champId);

                // Fallback: Se a tabela estiver vazia, tenta usar o que está no state local (settings)
                if (!allPartsSelections || allPartsSelections.length === 0) {
                    console.log("⚠️ Tabela championship_participants vazia, usando dados dos settings...");
                    allPartsSelections = (form.getValues("participants") || []).map((p: any) => ({
                        user_id: p.userId,
                        team_selections: p.teamSelections || []
                    })) as any;
                }

                if (allPartsSelections && allPartsSelections.length > 0) {
                    const bestHits = allPartsSelections.map((p: any) => {
                        const selections = (p.team_selections as string[]) || [];
                        const hitRanks = selections.map((t: string) => {
                            // Trim para evitar erros de espaço
                            const cleanT = t.trim();
                            const r = officialRanking.findIndex(rankName => rankName.trim() === cleanT);
                            return r === -1 ? 999 : r;
                        });

                        const minRank = Math.min(...hitRanks);
                        const optIdx = hitRanks.indexOf(minRank);

                        // Encontrar os dados do perfil para o banner
                        const profile = participants.find(part => part.userId === p.user_id);

                        return {
                            userId: p.user_id,
                            displayName: profile?.displayName || "Usuário",
                            photoUrl: profile?.photoUrl,
                            minRank,
                            optIdx
                        };
                    });

                    // Filtrar quem não acertou nada (999) ou seleções vazias (Infinity)
                    const validHits = bestHits.filter(h => h.minRank !== 999 && h.minRank !== Infinity);

                    if (validHits.length > 0) {
                        const globalMinRank = Math.min(...validHits.map(h => h.minRank));
                        const candidates = validHits.filter(h => h.minRank === globalMinRank);
                        const bestOpt = Math.min(...candidates.map(c => c.optIdx));
                        goldWinners = candidates.filter(c => c.optIdx === bestOpt);
                        console.log(`✨ Palpiteiro(s) de Ouro encontratos:`, goldWinners.map(g => g.displayName));
                    }
                }
            }

            // 4. Montar a lista final
            const newWinners: any[] = [];

            pointChampions.forEach((u: any) => {
                newWinners.push({
                    userId: u.user_id,
                    displayName: u.nickname || u.nome,
                    photoUrl: u.foto_perfil,
                    position: 'champion'
                });
            });

            goldWinners.forEach((u: any) => {
                newWinners.push({
                    userId: u.userId,
                    displayName: u.displayName,
                    photoUrl: u.photoUrl,
                    position: 'gold_winner'
                });
            });

            form.setValue("manualWinners", newWinners);
            alert(`Sucesso! Sugeridos ${pointChampions.length} campeão(ões) e ${goldWinners.length} palpiteiro(s) de ouro.`);

        } catch (e: any) {
            console.error("❌ Erro no cálculo automático:", e);
            alert("Erro ao calcular: " + (e.message || "Verifique o console"));
        } finally {
            setIsAutoFilling(false);
        }
    };

    // Helper to add participant
    const addParticipant = (user: any) => {
        const current = form.getValues("participants") || [];
        const uid = user.id;
        if (!uid) return;

        // Prevent duplicates
        if (current.some(p => p.userId === uid)) return;

        const newParticipant = {
            userId: uid,
            displayName: user.nickname || user.nome,
            photoUrl: user.foto_perfil || "",
            email: user.email || ""
        };
        form.setValue("participants", [...current, newParticipant]);
    };

    const removeParticipant = (userId: string) => {
        form.setValue("participants", participants.filter((p: any) => p.userId !== userId));
    };

    const mapDbTeamToUi = (t: any) => ({
        id: t.id,
        name: t.name,
        shieldUrl: t.shield_url || t.shieldUrl
    });

    const handleQuickTeamAdd = async (overwrite: boolean = false, forceUseExisting: boolean = false) => {
        if (!quickTeam.name) return;
        setIsCreatingTeam(true);

        try {
            let targetTeam = duplicateTeam;

            // 1. Check for duplicates (still client-side for fast UX, but the API will also check)
            if (!targetTeam && !forceUseExisting && !overwrite) {
                const { data: existing, error: searchError } = await supabase
                    .from("teams")
                    .select("*")
                    .ilike("name", quickTeam.name);

                if (searchError) throw searchError;

                if (existing && existing.length > 0) {
                    setDuplicateTeam(existing[0]);
                    setShowDuplicateDialog(true);
                    setIsCreatingTeam(false);
                    return;
                }
            }

            // 2. Call Admin API to bypass RLS
            const response = await fetch("/api/admin/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: overwrite ? targetTeam?.id : undefined,
                    name: quickTeam.name,
                    short_name: quickTeam.shortName || null,
                    shield_url: quickTeam.shieldUrl || null,
                    type: quickTeam.type,
                    overwrite: overwrite || forceUseExisting
                })
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 409) { // Conflict
                    setDuplicateTeam(result.team);
                    setShowDuplicateDialog(true);
                    setIsCreatingTeam(false);
                    return;
                }
                throw new Error(result.error || "Erro ao salvar equipe");
            }

            const finalTeam = mapDbTeamToUi(result);

            if (finalTeam) {
                const currentTeams = (form.getValues("teams") as any[]) || [];
                if (!currentTeams.some(t => t.id === finalTeam.id)) {
                    form.setValue("teams", [...currentTeams, finalTeam] as any);
                }
            }

            setQuickTeam({ name: "", shortName: "", shieldUrl: "", type: "national" });
            setDuplicateTeam(null);
            setShowDuplicateDialog(false);

        } catch (error: any) {
            console.error("Error detailed:", error);
            const msg = error.message || "Erro desconhecido ao processar equipe.";
            alert(`Erro: ${msg}`);
        } finally {
            setIsCreatingTeam(false);
        }
    };

    const bannerLayout = form.watch("bannerConfig.layoutStyle");

    // Check for ties to enforce classic layout
    const championsCount = manualWinners.filter(w => w.position === 'champion').length;
    const goldCount = manualWinners.filter(w => w.position === 'gold_winner').length;
    const hasTies = championsCount > 1 || goldCount > 1;

    useEffect(() => {
        if (hasTies && bannerLayout !== 'classic') {
            form.setValue("bannerConfig.layoutStyle", "classic");
        }
    }, [hasTies, bannerLayout, form]);


    const getPositionLabel = (position: string) => {
        switch (position) {
            case 'champion': return 'Campeão';
            case 'gold_winner': return 'Vencedor Ouro';
            case 'silver_winner': return 'Vencedor Prata';
            case 'bronze_winner': return 'Vencedor Bronze';
            default: return position;
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger value="general" className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2 text-[10px] sm:text-sm py-2 sm:py-1.5 h-full">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Gerais</span>
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2 text-[10px] sm:text-sm py-2 sm:py-1.5 h-full">
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden sm:inline">Regras</span>
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2 text-[10px] sm:text-sm py-2 sm:py-1.5 h-full">
                        <Shield className="h-4 w-4" />
                        <span className="hidden sm:inline">Equipes</span>
                    </TabsTrigger>
                    <TabsTrigger value="participants" className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2 text-[10px] sm:text-sm py-2 sm:py-1.5 h-full">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Participantes</span>
                    </TabsTrigger>
                    <TabsTrigger value="scoring" className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2 text-[10px] sm:text-sm py-2 sm:py-1.5 h-full">
                        <Trophy className="h-4 w-4" />
                        <span className="hidden sm:inline">Pontuação</span>
                    </TabsTrigger>
                    <TabsTrigger value="banner" className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2 text-[10px] sm:text-sm py-2 sm:py-1.5 h-full">
                        <ImageIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Banner / Rank</span>
                    </TabsTrigger>
                </TabsList>

                {/* ABA GERAIS */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Básicas</CardTitle>
                            <CardDescription>Defina os detalhes principais do campeonato.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome do Campeonato</Label>
                                <Input id="name" {...form.register("name")} placeholder="Ex: Brasileirão 2024" />
                                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="iconUrl">Ícone (Logo)</Label>
                                <div className="flex gap-2">
                                    <Input id="iconUrl" {...form.register("iconUrl")} placeholder="https://..." className="flex-1" />
                                    <input
                                        type="file"
                                        ref={logoInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'icon')}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {form.formState.errors.iconUrl && <p className="text-sm text-destructive">{form.formState.errors.iconUrl.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label>Status do Campeonato</Label>
                                <Select
                                    onValueChange={(val) => form.setValue("status", val as any)}
                                    defaultValue={form.watch("status")}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rascunho">Rascunho (Não visível)</SelectItem>
                                        <SelectItem value="agendado">Agendado (Futuro / Countdown)</SelectItem>
                                        <SelectItem value="ativo">Ativo (Em andamento)</SelectItem>
                                        <SelectItem value="finished">Finalizado (Encerrado)</SelectItem>
                                        <SelectItem value="arquivado">Arquivado (Oculto)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Tipo de Cadastro</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("creationType", val as "manual" | "hybrid" | "auto")}
                                        defaultValue={form.watch("creationType")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual (Criar jogos na mão)</SelectItem>
                                            <SelectItem value="hybrid">Híbrido (Manual + API)</SelectItem>
                                            <SelectItem value="auto">Automático (Só API)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Código da API (Ex: PL, WC)</Label>
                                    <Input
                                        {...form.register("apiCode")}
                                        placeholder="Código da competição na API"
                                        disabled={form.watch("creationType") === "manual"}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Data de Início</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="DD/MM/AAAA"
                                            {...form.register("startDateInput")}
                                            className="flex-1"
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                if (v.length >= 5) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
                                                else if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                                e.target.value = v;
                                                form.setValue("startDateInput", v);

                                                if (v.length === 10) {
                                                    const [d, m, y] = v.split('/').map(Number);
                                                    const date = new Date(y, m - 1, d);
                                                    if (!isNaN(date.getTime())) form.setValue("startDate", date);
                                                }
                                            }}
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon" className="shrink-0">
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.watch("startDate")}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            form.setValue("startDate", date);
                                                            form.setValue("startDateInput", format(date, "dd/MM/yyyy"));
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {form.formState.errors.startDate && <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label>Data de Fim</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="DD/MM/AAAA"
                                            {...form.register("endDateInput")}
                                            className="flex-1"
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                if (v.length >= 5) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
                                                else if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                                e.target.value = v;
                                                form.setValue("endDateInput", v);

                                                if (v.length === 10) {
                                                    const [d, m, y] = v.split('/').map(Number);
                                                    const date = new Date(y, m - 1, d);
                                                    if (!isNaN(date.getTime())) form.setValue("endDate", date);
                                                }
                                            }}
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon" className="shrink-0">
                                                    <CalendarIcon className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.watch("endDate")}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            form.setValue("endDate", date);
                                                            form.setValue("endDateInput", format(date, "dd/MM/yyyy"));
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {form.formState.errors.endDate && <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Placar da API (Modo de Busca)</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("apiScoreType", val as "fullTime" | "regularTime")}
                                        defaultValue={form.watch("apiScoreType") || "fullTime"}
                                        disabled={form.watch("creationType") === "manual"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o modo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fullTime">Tempo Integral (Com Prorrogação)</SelectItem>
                                            <SelectItem value="regularTime">Tempo Regular (90 min)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        Define qual placar buscar da API. Ligas (ex: Brasileirão) usam 90min. Copas podem variar.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Tipo do Campeonato</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("type", val as "liga" | "copa" | "avulso")}
                                        defaultValue={form.watch("type")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="liga">Liga (Pontos Corridos)</SelectItem>
                                            <SelectItem value="copa">Copa (Mata-mata)</SelectItem>
                                            <SelectItem value="avulso">Jogos Avulsos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Agrupamento (Histórico)</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("category", val)}
                                        defaultValue={form.watch("category") || "other"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="world_cup">Copa do Mundo</SelectItem>
                                            <SelectItem value="euro">Eurocopa</SelectItem>
                                            <SelectItem value="copa_america">Copa América</SelectItem>
                                            <SelectItem value="brasileirao">Brasileirão</SelectItem>
                                            <SelectItem value="libertadores">Libertadores</SelectItem>
                                            <SelectItem value="champions_league">Champions League</SelectItem>
                                            <SelectItem value="nacional">Nacional</SelectItem>
                                            <SelectItem value="other">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Modo de Equipes</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("teamMode", val as "clubes" | "selecoes" | "mista")}
                                        defaultValue={form.watch("teamMode")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="clubes">Times (Clubes)</SelectItem>
                                            <SelectItem value="selecoes">Seleções Nacionais</SelectItem>
                                            <SelectItem value="mista">Mista</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA REGRAS */}
                <TabsContent value="rules">
                    <Card>
                        <CardHeader>
                            <CardTitle>Regras do Campeonato</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Jogador Fantasma</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Permitir palpites em nome de outros (Admin).
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("ghostPlayer")}
                                    onCheckedChange={(checked) => form.setValue("ghostPlayer", checked)}
                                />
                            </div>

                            <div className="grid gap-2 mt-4">
                                <Label>Slots de Escolha de Equipes</Label>
                                <Input
                                    type="number"
                                    placeholder="Ex: 3 (Euro 2012) ou 4 (Copa 2019)"
                                    {...form.register("selectionSlots")}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Quantas seleções cada participante poderá escolher para pontuar no ranking de "Escolha de Seleções".
                                </p>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-yellow-600 dark:text-yellow-500">Prioridade na Escolha (Desempate)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Se habilitado, a ordem das opções (1º, 2º, 3º) define a vantagem global entre competidores (Regra da Planilha).
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("enableSelectionPriority")}
                                    onCheckedChange={(checked) => form.setValue("enableSelectionPriority", checked)}
                                />
                            </div>

                            {/* Em breve: Drag & Drop de Critérios de Desempate */}
                            <div className="rounded-lg border p-4 bg-muted/10 opacity-60 cursor-not-allowed">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="font-semibold">Critérios de Desempate (Prioridade)</Label>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Em Breve</span>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2 border p-2 rounded bg-background">1. Pontuação Geral</li>
                                    <li className="flex items-center gap-2 border p-2 rounded bg-background">2. Maior nº de Cravadas (Buchas)</li>
                                    <li className="flex items-center gap-2 border p-2 rounded bg-background">3. Maior nº de Situações</li>
                                    <li className="flex items-center gap-2 border p-2 rounded bg-background">4. Menor nº de Erros</li>
                                    <li className="flex items-center gap-2 border p-2 rounded bg-background font-medium text-yellow-600 dark:text-yellow-500">5. Melhor Posição na Escolha do Campeão</li>
                                </ul>
                                <p className="text-[10px] mt-2 text-muted-foreground">
                                    Essa ordem será configurável via arrastar e soltar em breve.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA EQUIPES (Placeholder) */}
                <TabsContent value="teams">
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipes Participantes</CardTitle>
                            <CardDescription>Gerencie quais equipes fazem parte deste campeonato.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar no Banco</Label>
                                    <Select onValueChange={(teamId) => {
                                        const fetchTeam = async () => {
                                            const { data } = await supabase.from("teams").select("*").eq("id", teamId).single();
                                            if (data) {
                                                const teamData = data as any;
                                                const current = (form.getValues("teams") as any[]) || [];
                                                if (!current.some(t => t.id === teamData.id)) {
                                                    form.setValue("teams", [...current, { id: teamData.id, name: teamData.name, shieldUrl: teamData.shield_url }] as any);
                                                }
                                            }
                                        };
                                        fetchTeam();
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Escolher equipe existente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <TeamSelectorItems
                                                supabase={supabase}
                                                selectedTeamIds={((form.watch("teams") as any[]) || []).map((t: any) => t.id)}
                                            />
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-[2] space-y-3 p-4 border rounded-lg bg-yellow-500/5 border-yellow-500/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Plus className="h-4 w-4 text-yellow-600" />
                                        <h4 className="text-xs font-bold uppercase text-yellow-700">Adicionar Nova Seleção/Equipe</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                        <div className="md:col-span-5">
                                            <Input
                                                placeholder="Nome (Ex: Holanda)"
                                                value={quickTeam.name}
                                                onChange={(e) => setQuickTeam({ ...quickTeam, name: e.target.value })}
                                                className="h-8 text-xs bg-background"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Input
                                                placeholder="Sigla"
                                                value={quickTeam.shortName}
                                                onChange={(e) => setQuickTeam({ ...quickTeam, shortName: e.target.value })}
                                                className="h-8 text-xs bg-background uppercase"
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <Input
                                                placeholder="URL do Escudo"
                                                value={quickTeam.shieldUrl}
                                                onChange={(e) => setQuickTeam({ ...quickTeam, shieldUrl: e.target.value })}
                                                className="h-8 text-xs bg-background"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="q-type"
                                                    checked={quickTeam.type === 'national'}
                                                    onChange={() => setQuickTeam({ ...quickTeam, type: 'national' })}
                                                    className="accent-yellow-600 h-3 w-3"
                                                />
                                                <span className="text-[10px] uppercase font-medium">Seleção</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="q-type"
                                                    checked={quickTeam.type === 'club'}
                                                    onChange={() => setQuickTeam({ ...quickTeam, type: 'club' })}
                                                    className="accent-yellow-600 h-3 w-3"
                                                />
                                                <span className="text-[10px] uppercase font-medium">Clube</span>
                                            </label>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => handleQuickTeamAdd(false)}
                                            disabled={!quickTeam.name || isCreatingTeam}
                                            size="sm"
                                            className="h-7 text-[10px] bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-4"
                                        >
                                            {isCreatingTeam ? <Loader2 className="h-3 w-3 animate-spin" /> : "ADICIONAR"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Duplicate Dialog */}
                            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-yellow-600">
                                            <AlertCircle className="h-5 w-5" />
                                            Equipe já cadastrada
                                        </DialogTitle>
                                        <DialogDescription>
                                            A equipe <strong>{duplicateTeam?.name}</strong> já existe no banco de dados.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                                        <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center p-1 border shadow-sm shrink-0">
                                            {duplicateTeam?.shield_url ? (
                                                <img src={duplicateTeam.shield_url} alt="Logo" className="h-full w-full object-contain" />
                                            ) : <Shield className="h-6 w-6 text-muted-foreground" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{duplicateTeam?.name} ({duplicateTeam?.short_name})</p>
                                            <p className="text-[10px] text-muted-foreground">ID: {duplicateTeam?.id}</p>
                                        </div>
                                    </div>
                                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowDuplicateDialog(false)}
                                            className="w-full sm:w-auto text-xs"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleQuickTeamAdd(false, true)}
                                            className="w-full sm:w-auto text-xs"
                                        >
                                            Usar Existente
                                        </Button>
                                        <Button
                                            onClick={() => handleQuickTeamAdd(true)}
                                            className="w-full sm:w-auto text-xs bg-yellow-600 hover:bg-yellow-700"
                                        >
                                            Sobrescrever Dados
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <div className="border-t pt-4">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-3 block">Equipes no Campeonato ({((form.watch("teams") as any[]) || []).length})</Label>
                                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {(form.watch("teams") as any[] || []).map((team: any, index: number) => (
                                        <div key={`${team.id}-${index}`} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/20 group hover:border-primary/50 transition-all opacity-100 hover:bg-background">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="h-6 w-6 shrink-0 bg-white rounded-full border flex items-center justify-center p-0.5 mt-0.5">
                                                    {team.shieldUrl ? (
                                                        <img src={team.shieldUrl} alt={team.name} className="h-full w-full object-contain" />
                                                    ) : <Shield className="h-2 w-2 text-muted-foreground" />}
                                                </div>
                                                <span className="text-[11px] font-bold truncate">{team.name}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    const current = form.getValues("teams") || [];
                                                    form.setValue("teams", current.filter((t: any) => t.id !== team.id));
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {((form.watch("teams") as any[]) || []).length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/10">
                                        <p className="text-xs text-muted-foreground">Nenhuma equipe adicionada a este campeonato.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA PARTICIPANTES */}
                <TabsContent value="participants">
                    <Card>
                        <CardHeader>
                            <CardTitle>Participantes</CardTitle>
                            <CardDescription>Gerencie quem está participando deste campeonato.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border">
                                <div className="text-sm font-medium">
                                    Total de Participantes: {participants.length}
                                </div>
                                <div className="w-[300px]">
                                    <UserSearch
                                        onSelect={addParticipant}
                                        // Removido bloqueio por status para permitir ajustes em campeonatos legados
                                        disabled={false}
                                    />
                                </div>
                            </div>

                            {(form.watch("status") === "ativo" || form.watch("status") === "finished") && (
                                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-md border border-blue-500/50 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>
                                        O campeonato já está em andamento ou finalizado. Alterações aqui afetarão o ranking retroativamente.
                                    </span>
                                </div>
                            )}

                            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {participants.map((p, index) => (
                                    <div key={`${p.userId}-${index}`} className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                                                {p.photoUrl ? <img src={p.photoUrl} alt={p.displayName} className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground font-bold">{p.displayName.substring(0, 2).toUpperCase()}</span>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground leading-none mb-0.5">{p.displayName}</span>
                                                {p.email && <span className="text-[10px] text-muted-foreground">{p.email}</span>}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            // Removido bloqueio por status
                                            disabled={false}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => removeParticipant(p.userId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {participants.length === 0 && (
                                    <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
                                        Nenhum participante adicionado ainda.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA PONTUAÇÃO */}
                <TabsContent value="scoring">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sistema de Pontuação</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Placar Exato (Bucha)</Label>
                                    <Input type="number" {...form.register("exactScorePoints")} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Vencedor/Empate (Situação)</Label>
                                    <Input type="number" {...form.register("winnerPoints")} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Sistema de Combo</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Habilitar aposta extra com fichas de gols.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("comboEnabled")}
                                    onCheckedChange={(checked) => form.setValue("comboEnabled", checked)}
                                />
                            </div>

                            {form.watch("comboEnabled") && (
                                <div className="rounded-lg border p-4 mt-4 bg-muted/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Pontos BÔNUS (Situação + Gols)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 2"
                                                {...form.register("bonusPoints")}
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Soma-se à pontuação tradicional caso o usuário acerte o vencedor + uso da ficha.
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Pontos COMBO (Bucha + Gols)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 5"
                                                {...form.register("comboPoints")}
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Pontuação Full (Bucha + Ficha). Geralmente substitui ou soma (configurável).
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                                        <Award className="h-4 w-4" />
                                        <span>
                                            Lembre-se de configurar a quantidade de fichas por fase na aba "Regras" (Em breve).
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA BANNER EDITADA */}
                <TabsContent value="banner">
                    <Card>
                        <CardHeader>
                            <CardTitle>Banner do Campeão (Hall da Fama)</CardTitle>
                            <CardDescription>Configure a aparência e os vencedores do banner final.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Toggle Ativo */}
                            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Gerar Banner ao Final</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Se ativo, o banner aparecerá automaticamente no Hall da Fama.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.watch("bannerEnabled")}
                                    onCheckedChange={(checked) => form.setValue("bannerEnabled", checked)}
                                />
                            </div>

                            {form.watch("bannerEnabled") && (
                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-100 p-4 flex justify-center items-center">
                                        <div className="w-full max-w-[500px] shadow-2xl skew-x-1 hover:skew-x-0 transition-transform duration-500">
                                            <ChampionBanner
                                                championshipName={form.watch("name") || "Nome do Campeonato"}
                                                config={form.watch("bannerConfig") as BannerConfig}
                                                winners={form.watch("manualWinners") as BannerWinner[] || []}
                                                teamMode={form.watch("teamMode") || "clubes"}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-center text-xs text-muted-foreground">Pré-visualização em tempo real</p>

                                    <div className="pt-4">
                                        <BannerConfigForm
                                            config={{
                                                active: true,
                                                titleColor: "#FFFFFF",
                                                subtitleColor: "#FBBF24",
                                                namesColor: "#FFFFFF",
                                                displayMode: "photo_and_names",
                                                layoutStyle: "modern",
                                                backgroundScale: 100,
                                                backgroundPosX: 50,
                                                backgroundPosY: 50,
                                                customFontSizeOffset: 0,
                                                selectionMode: "manual",
                                                ...form.watch("bannerConfig")
                                            }}
                                            onChange={(newConfig) => form.setValue("bannerConfig", newConfig as any, { shouldDirty: true })}
                                            hasTies={hasTies}
                                        />
                                    </div>

                                    {/* Button to suggest winners */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl flex items-center gap-2">Configuração do Banner</CardTitle>
                                            <CardDescription>O banner será exibido no Hall da Fama quando o campeonato for finalizado.</CardDescription>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isAutoFilling}
                                            onClick={handleAutoFillWinners}
                                            className="bg-yellow-500/5 border-yellow-500/20 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/10 font-bold transition-all shadow-sm"
                                        >
                                            {isAutoFilling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trophy className="h-4 w-4 mr-2" />}
                                            Sugerir Vencedores
                                        </Button>
                                    </div>

                                    {/* MODE SELECTION TOGGLE */}
                                    <div className="border-t pt-4 space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <Label className="text-base font-bold">Modo de Seleção dos Vencedores</Label>
                                            <RadioGroup
                                                value={form.watch("bannerConfig.selectionMode") || "manual"}
                                                onValueChange={(val) => form.setValue("bannerConfig.selectionMode", val as any)}
                                                className="flex gap-6"
                                            >
                                                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors w-full sm:w-auto">
                                                    <RadioGroupItem value="auto" id="r-auto" />
                                                    <Label htmlFor="r-auto" className="cursor-pointer">
                                                        Automático
                                                        <span className="block text-xs text-muted-foreground font-normal">Calculado pelas regras</span>
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors w-full sm:w-auto bg-yellow-500/5 border-yellow-500/20">
                                                    <RadioGroupItem value="manual" id="r-manual" />
                                                    <Label htmlFor="r-manual" className="cursor-pointer">
                                                        Manual (Dedo de Deus)
                                                        <span className="block text-xs text-muted-foreground font-normal">Você escolhe os nomes</span>
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    </div>


                                    {/* SECTION: OFFICIAL RANKING (Global - Visible in both modes) */}
                                    <div className="border-t pt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Award className="h-5 w-5 text-yellow-500" />
                                            <h3 className="font-bold text-lg">Resultado Oficial do Campeonato</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            Defina a ordem real das 5 melhores seleções. O sistema usará isso para calcular o <strong>Palpiteiro de Ouro</strong> (Auto) e para o feedback visual de bandeiras (Highlander).
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                                            {[1, 2, 3, 4, 5].map((pos) => (
                                                <div key={pos} className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                                        {pos}º Lugar
                                                    </Label>
                                                    <Select
                                                        value={(form.watch("officialRanking") as any)?.[pos - 1] || ""}
                                                        onValueChange={(val) => {
                                                            const current = [...((form.getValues("officialRanking") as any[]) || ["", "", "", "", ""])];
                                                            current[pos - 1] = val;
                                                            form.setValue("officialRanking", current as any);
                                                        }}
                                                    >
                                                        <SelectTrigger className="bg-background">
                                                            <SelectValue placeholder="Escolher..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="-">Nenhum</SelectItem>
                                                            {(form.watch("teams") as any[] || [])
                                                                .filter((t) => {
                                                                    const currentRanking = (form.watch("officialRanking") as string[]) || [];
                                                                    const currentValue = currentRanking[pos - 1];
                                                                    // Mostrar se não está selecionado em outro lugar OU se é o valor atual deste select
                                                                    const isSelectedElsewhere = currentRanking.includes(t.name) && t.name !== currentValue;
                                                                    return !isSelectedElsewhere;
                                                                })
                                                                .map((t) => (
                                                                    <SelectItem key={t.id} value={t.name}>
                                                                        <div className="flex items-center gap-2">
                                                                            {t.shieldUrl && <img src={t.shieldUrl} className="h-4 w-4 object-contain" />}
                                                                            {t.name}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SECTION: MANUAL OVERRIDE (DEDO DE DEUS) */}
                                    {(form.watch("bannerConfig.selectionMode") === 'manual' || !form.watch("bannerConfig.selectionMode")) && (
                                        <div className="border-t pt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-lg">Vencedores (Seleção Manual)</h3>
                                                <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                    Sobejuga o cálculo automático
                                                </div>
                                            </div>

                                            {/* General Champion Selector */}
                                            <div className="grid gap-2 p-4 bg-muted/30 border border-border rounded-lg">
                                                <Label className="text-base font-bold text-yellow-600 dark:text-yellow-500">🏆 Campeão Geral</Label>

                                                {/* List of current champions */}
                                                <div className="space-y-2">
                                                    {form.watch("manualWinners")?.filter(w => w.position === 'champion').map((winner) => (
                                                        <div key={winner.userId} className="flex items-center justify-between gap-3 bg-card border border-border p-2 rounded shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-8 w-8 bg-muted rounded-full overflow-hidden">
                                                                    {winner.photoUrl && <img src={winner.photoUrl} className="h-full w-full object-cover" />}
                                                                </div>
                                                                <span className="font-medium text-foreground">{winner.displayName}</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                type="button"
                                                                onClick={() => removeManualWinner(winner.userId, 'champion')}
                                                                className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-2">
                                                    <Select onValueChange={(userId) => {
                                                        const p = participants.find(p => p.userId === userId);
                                                        if (p) addManualWinner({ id: p.userId, nickname: p.displayName, photoUrl: p.photoUrl }, 'champion');
                                                    }}>
                                                        <SelectTrigger className="bg-background">
                                                            <SelectValue placeholder="Selecione o Campeão..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {participants.map(p => (
                                                                <SelectItem key={p.userId} value={p.userId}>
                                                                    {p.displayName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>



                                            {/* Gold Winner Selector */}
                                            <div className="grid gap-2 p-4 bg-muted/30 border border-border rounded-lg mt-6">
                                                <Label className="text-base font-bold text-yellow-600 dark:text-yellow-500">🌟 Palpiteiro de Ouro</Label>

                                                {/* List of current gold winners */}
                                                <div className="space-y-2">
                                                    {form.watch("manualWinners")?.filter(w => w.position === 'gold_winner').map((winner) => (
                                                        <div key={winner.userId} className="flex items-center justify-between gap-3 bg-card border border-border p-2 rounded shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-8 w-8 bg-muted rounded-full overflow-hidden">
                                                                    {winner.photoUrl && <img src={winner.photoUrl} className="h-full w-full object-cover" />}
                                                                </div>
                                                                <span className="font-medium text-foreground">{winner.displayName}</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                type="button"
                                                                onClick={() => removeManualWinner(winner.userId, 'gold_winner')}
                                                                className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-2">
                                                    <Select onValueChange={(userId) => {
                                                        const p = participants.find(p => p.userId === userId);
                                                        if (p) addManualWinner({ id: p.userId, nickname: p.displayName, photoUrl: p.photoUrl }, 'gold_winner');
                                                    }}>
                                                        <SelectTrigger className="bg-background">
                                                            <SelectValue placeholder="Selecione um participante..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {participants.map(p => (
                                                                <SelectItem key={p.userId} value={p.userId}>
                                                                    {p.displayName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >

            {/* Validation Error Feedback */}
            {Object.keys(form.formState.errors).length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                    <p className="text-sm font-bold text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Existem erros no formulário que impedem o salvamento:
                    </p>
                    <ul className="text-xs text-destructive/80 list-disc list-inside">
                        {Object.entries(form.formState.errors).map(([field, error]: [string, any]) => (
                            <li key={field}>
                                <strong>{field}:</strong> {error.message || (typeof error === 'object' ? 'Campo inválido' : error)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            {submitLabel}
                        </>
                    )}
                </Button>
            </div>
        </form >
    );
}
