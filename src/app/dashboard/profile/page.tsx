"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Trophy, Users, Gamepad2, Edit, Clock, Target, CheckCircle, Gem, XCircle, Goal, Upload, Trash2, Camera, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Helper to center the crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export default function ProfilePage() {
    const { user, profile } = useAuth();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile State
    const [fullName, setFullName] = useState("");
    const [nickname, setNickname] = useState("");
    const [photoURL, setPhotoURL] = useState("");

    // Stats State
    const [stats, setStats] = useState({
        totalPoints: 0,
        ranking: "-",
        totalPredictions: 0,
        championshipsDisputed: 0,
        titlesWon: 0,
        goldMedals: 0
    });
    const [championships, setChampionships] = useState<any[]>([]);
    const [selectedChampionship, setSelectedChampionship] = useState("all");
    const [userPredictions, setUserPredictions] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Image Cropping State
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [showCropModal, setShowCropModal] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                // 1. Fetch User Profile
                const { data: profileData } = await (supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single() as any);

                if (profileData) {
                    setFullName(profileData.nome || "");
                    setNickname(profileData.nickname || "");
                    setPhotoURL(profileData.foto_perfil || "");
                }

                // 2. Fetch Actual Participation (to get all championships the user ever joined)
                const { data: participationData } = await (supabase
                    .from("championship_participants") as any)
                    .select("championship_id")
                    .eq("user_id", user.id);
                const participantIds = (participationData || []).map((p: any) => p.championship_id);

                // 3. Fetch User Predictions with Match info
                const { data: predictions } = await (supabase
                    .from("predictions") as any)
                    .select("*, matches(championship_id, score_home, score_away)")
                    .eq("user_id", user.id);

                const preds = (predictions || []).map((p: any) => ({
                    ...p,
                    championship_id: p.matches?.championship_id
                }));
                setUserPredictions(preds || []);

                const uniqueChampionshipIds = Array.from(new Set([
                    ...preds.map((p: any) => p.championship_id).filter(Boolean),
                    ...participantIds
                ]));

                // 4. Fetch All Championships
                const { data: allChamps } = await (supabase.from("championships") as any).select("*");
                const champs = (allChamps || []) as any[];
                const filteredChamps = champs
                    .filter(c => uniqueChampionshipIds.includes(c.id))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setChampionships(filteredChamps);
                if (filteredChamps.length > 0 && selectedChampionship === "all") {
                    setSelectedChampionship(filteredChamps[0].id);
                }

                // 5. Titles and Medals would come from a winners table or JSON settings in championship
                // Here we use a placeholder or check if settings JSON has winners
                // Calculate Titles (Champion positions)
                const titlesWon = (allChamps || []).filter((c: any) => {
                    const settings = c.settings || {};
                    const winners = settings.winners || settings.manualWinners || [];
                    return winners.some((w: any) =>
                        (w.user_id === user.id || w.userId === user.id) &&
                        w.position === 'champion'
                    );
                }).length;

                const goldMedals = (allChamps || []).filter((c: any) => {
                    const settings = c.settings || {};
                    const winners = settings.winners || settings.manualWinners || [];
                    return winners.some((w: any) =>
                        (w.user_id === user.id || w.userId === user.id) &&
                        w.position === 'gold_winner'
                    );
                }).length;

                // 6. Calculate Disputed Championships
                // Disputed = Linked championships that are FINISHED
                const championshipsDisputed = (allChamps || []).filter((c: any) => {
                    const isFinished = c.status === 'finalizado' || c.status === 'finished';
                    if (!isFinished) return false;

                    // Check Join Table
                    const isInJoinTable = participantIds.includes(c.id);
                    if (isInJoinTable) return true;

                    // Check Settings JSON
                    const settingsParticipants = c.settings?.participants || [];
                    const isInJson = settingsParticipants.some((p: any) => (p.userId === user.id || p.user_id === user.id));
                    return isInJson;
                }).length;

                setStats({
                    totalPoints: (profileData as any)?.total_points || 0,
                    ranking: "-",
                    totalPredictions: predictions?.length || 0,
                    championshipsDisputed: championshipsDisputed,
                    titlesWon: titlesWon,
                    goldMedals: goldMedals
                });

            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user, supabase]);

    // Image Selection
    function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImgSrc(reader.result?.toString() || '');
                setShowCropModal(true);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1));
    }

    // Generate Cropped Image as Blob with Compression
    async function getCroppedImgBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        // Define max dimensions for profile photos (800x800 is a good balance)
        const MAX_DIM = 800;
        let targetWidth = crop.width;
        let targetHeight = crop.height;

        if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / targetWidth, MAX_DIM / targetHeight);
            targetWidth = targetWidth * ratio;
            targetHeight = targetHeight * ratio;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('No 2d context');

        // High quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            targetWidth,
            targetHeight,
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', 0.85); // Increased quality (0.85) for better focus
        });
    }

    const handleCropConfirm = async () => {
        if (completedCrop && imgRef.current) {
            const blob = await getCroppedImgBlob(imgRef.current, completedCrop);
            // Create a temporary URL for preview
            const objectUrl = URL.createObjectURL(blob);
            setPhotoURL(objectUrl); // Set temporary URL for visual feedback
            (window as any)._pendingAvatarBlob = blob; // Store blob temporarily for saving
            setShowCropModal(false);
            setImgSrc('');
        }
    };

    const handleRemoveImage = () => {
        setPhotoURL("");
        (window as any)._pendingAvatarBlob = null;
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            let finalPhotoURL = photoURL;
            const pendingBlob = (window as any)._pendingAvatarBlob;

            // 1. If there's a new cropped image, upload it to Storage
            if (pendingBlob) {
                // 1.1 First, identify if there is an old photo in Storage to delete
                if (profile?.foto_perfil && profile.foto_perfil.includes('/storage/v1/object/public/avatars/')) {
                    try {
                        // Extract filename more safely (removing query params if any)
                        const urlParts = profile.foto_perfil.split('/');
                        const lastPart = urlParts[urlParts.length - 1];
                        const oldPath = lastPart.split('?')[0];

                        if (oldPath) {
                            console.log("Removing old avatar:", oldPath);
                            const { error: removeError } = await supabase.storage
                                .from('avatars')
                                .remove([oldPath]);

                            if (removeError) {
                                console.error("Remove error detail:", removeError);
                            }
                        }
                    } catch (e) {
                        console.error("Error deleting old avatar:", e);
                    }
                }

                const fileExt = 'jpg';
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, pendingBlob, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                finalPhotoURL = publicUrl;
                (window as any)._pendingAvatarBlob = null; // Clear pending
            }

            // 2. Update profile with the Storage URL
            const { error } = await (supabase.from("profiles") as any).update({
                nome: fullName,
                nickname: nickname,
                foto_perfil: finalPhotoURL
            }).eq("id", user.id);

            if (error) throw error;
            setIsDialogOpen(false);
            setPhotoURL(finalPhotoURL); // Update state with stable URL
        } catch (error: any) {
            console.error("Error updating profile details:", {
                code: error.code,
                message: error.message,
                details: error.details
            });
            alert(`Erro ao atualizar perfil: ${error.message || "Tente novamente"}`);
        } finally {
            setSaving(false);
        }
    };

    const getFilteredStats = () => {
        let filteredPreds = userPredictions;
        if (selectedChampionship !== "all") {
            filteredPreds = userPredictions.filter((p: any) => p.championship_id === selectedChampionship);
        }

        let points = 0;
        let buchas = 0;
        let situacao = 0;
        let erros = 0;

        filteredPreds.forEach((p: any) => {
            points += (p.points || 0);

            const match = p.matches;
            if (match && match.score_home !== null && match.score_away !== null) {
                const ph = p.home_score;
                const pa = p.away_score;
                const mh = match.score_home;
                const ma = match.score_away;

                const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
                const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);

                if (ph === mh && pa === ma) {
                    buchas++;
                } else if (winP === winM) {
                    situacao++;
                } else {
                    erros++;
                }
            }
        });

        return { points, buchas, situacao, combo: 0, bonus: 0, gols: 0, erros };
    };

    const filteredStats = getFilteredStats();
    const displayName = nickname || fullName || "Usuário sem nome";

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <Card className="bg-card dark:bg-slate-950/50 border-border dark:border-slate-800 text-card-foreground overflow-hidden relative shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
                    <Trophy className="h-64 w-64 text-foreground dark:text-slate-700" />
                </div>
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    <div className="relative">
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background dark:border-slate-800 shadow-xl">
                            <AvatarImage src={photoURL || undefined} />
                            <AvatarFallback className="bg-muted dark:bg-slate-800 text-2xl font-bold">
                                {displayName?.substring(0, 2).toUpperCase() || <User />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-1 right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-card dark:border-slate-950" title="Online"></div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <h1 className="text-3xl font-bold">{displayName}</h1>
                        {nickname && <p className="text-muted-foreground text-sm">({fullName})</p>}
                        <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                            <User className="h-4 w-4" /> {user?.email}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-border hover:bg-muted font-bold shadow-sm">
                                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Suas Informações</DialogTitle>
                                    <DialogDescription className="text-muted-foreground">Atualize seus dados pessoais e imagem de perfil.</DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-6 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Nome Completo</Label>
                                        <Input
                                            id="fullName"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="bg-background border-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nickname">Apelido</Label>
                                        <Input
                                            id="nickname"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="Como você quer ser chamado"
                                            className="bg-background border-input"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <Label>Imagem de Perfil</Label>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16 border-2 border-border">
                                                <AvatarImage src={photoURL || undefined} />
                                                <AvatarFallback className="bg-muted text-muted-foreground">
                                                    {displayName?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex gap-2">
                                                <input ref={fileInputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
                                                <Button variant="outline" className="bg-background border-border hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
                                                    <Upload className="mr-2 h-4 w-4" /> Escolher Imagem
                                                </Button>
                                                {photoURL && (
                                                    <Button variant="ghost" size="icon" onClick={handleRemoveImage} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
                                    <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
                <DialogContent className="sm:max-w-[600px] bg-slate-950 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100">Recortar Imagem</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-4 bg-slate-900 rounded-lg overflow-hidden">
                        {imgSrc && (
                            <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={1} circularCrop>
                                <img ref={imgRef} alt="Crop me" src={imgSrc} onLoad={onImageLoad} style={{ maxHeight: '60vh' }} />
                            </ReactCrop>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCropModal(false)} className="text-slate-400">Cancelar</Button>
                        <Button onClick={handleCropConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">Confirmar Recorte</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">Informações Gerais</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Títulos Conquistados</p>
                                <p className="text-3xl font-bold text-yellow-500">{stats.titlesWon}</p>
                            </div>
                            <Trophy className="h-8 w-8 text-yellow-500 opacity-80" />
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Palpite do Campeão</p>
                                <p className="text-3xl font-bold text-amber-500">{stats.goldMedals}</p>
                            </div>
                            <Gem className="h-8 w-8 text-amber-500 opacity-80" />
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Campeonatos Disputados</p>
                                <p className="text-3xl font-bold text-blue-500">{stats.championshipsDisputed}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500 opacity-80" />
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50 hover:bg-card transition-colors">
                        <CardContent className="p-6 flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Total de Palpites</p>
                                <p className="text-3xl font-bold text-purple-500">{stats.totalPredictions}</p>
                            </div>
                            <Gamepad2 className="h-8 w-8 text-purple-500 opacity-80" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {championships.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Estatísticas por Campeonato</h2>
                        <div className="w-[250px]">
                            <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                                <SelectTrigger><SelectValue placeholder="Selecione um campeonato" /></SelectTrigger>
                                <SelectContent>
                                    {championships.map((champ) => <SelectItem key={champ.id} value={champ.id}>{champ.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        <StatCard title="Pontos" value={filteredStats.points} icon={<Gamepad2 className="h-4 w-4" />} color="bg-muted" text="text-foreground" description="Total de pontos no campeonato" />
                        <StatCard title="Buchas" value={filteredStats.buchas} icon={<Target className="h-4 w-4" />} color="bg-green-600" description="Placares cravados" link={`/dashboard/history?championship=${selectedChampionship}&user=${user?.id}&type=bucha`} />
                        <StatCard title="Situação" value={filteredStats.situacao} icon={<CheckCircle className="h-4 w-4" />} color="bg-blue-600" description="Vencedor/Empate corretos" link={`/dashboard/history?championship=${selectedChampionship}&user=${user?.id}&type=situacao`} />
                        {filteredStats.combo > 0 && <StatCard title="Combo" value={filteredStats.combo} icon={<Gem className="h-4 w-4" />} color="bg-yellow-500" description="Bucha + Gols" pulse />}
                        {filteredStats.bonus > 0 && <StatCard title="Bônus" value={filteredStats.bonus} icon={<Trophy className="h-4 w-4" />} color="bg-slate-300" text="text-slate-900" description="Situação + Gols" />}
                        {filteredStats.gols > 0 && <StatCard title="Gols" value={filteredStats.gols} icon={<Goal className="h-4 w-4" />} color="bg-purple-600" description="Acerto apenas nos gols" />}
                        <StatCard title="Erros" value={filteredStats.erros} icon={<XCircle className="h-4 w-4" />} color="bg-red-600" description="Palpites sem pontuação" link={`/dashboard/history?championship=${selectedChampionship}&user=${user?.id}&type=erro`} />
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, color, description, text = "text-white", pulse = false, link }: any) {
    const content = (
        <CardContent className="p-4 flex flex-col justify-between h-full bg-opacity-90">
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start">
                    <span className="text-xs font-medium opacity-80">{title}</span>
                    <span className="opacity-60">{icon}</span>
                </div>
                {description && <span className="text-[10px] leading-tight opacity-70 line-clamp-2">{description}</span>}
            </div>
            <span className="text-2xl font-bold mt-2">{value}</span>
        </CardContent>
    );

    if (link) {
        return (
            <Link href={link}>
                <Card className={`${color} ${text} ${pulse ? "animate-pulse ring-2 ring-yellow-300/50" : ""} border-none cursor-pointer hover:ring-2 hover:ring-white/20 transition-all active:scale-95`}>
                    {content}
                </Card>
            </Link>
        );
    }

    return (
        <Card className={`${color} ${text} ${pulse ? "animate-pulse ring-2 ring-yellow-300/50" : ""} border-none`}>
            {content}
        </Card>
    );
}
