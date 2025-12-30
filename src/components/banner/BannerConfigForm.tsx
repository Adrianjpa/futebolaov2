import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { BannerConfig } from "@/types/banner";

interface BannerConfigFormProps {
    config: BannerConfig;
    onChange: (newConfig: BannerConfig) => void;
    hasTies: boolean;
}

export function BannerConfigForm({ config, onChange, hasTies }: BannerConfigFormProps) {
    const supabase = createClient();
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    const update = (key: keyof BannerConfig, value: any) => {
        onChange({ ...config, [key]: value });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(type);
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

            if (type === 'logo') {
                update("championshipLogoUrl", publicUrl);
            } else {
                update("backgroundUrl", publicUrl);
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Erro ao fazer upload da imagem.");
        } finally {
            setIsUploading(null);
            if (event.target) event.target.value = '';
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <div className="grid gap-2">
                <Label>Estilo do Banner</Label>
                <Select
                    onValueChange={(val) => update("layoutStyle", val as "modern" | "classic")}
                    value={hasTies ? "classic" : (config.layoutStyle || "modern")}
                    disabled={hasTies}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="modern">Moderno (Cards)</SelectItem>
                        <SelectItem value="classic">Clássico (Texto/Lista)</SelectItem>
                    </SelectContent>
                </Select>
                {hasTies && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                        Forçado para Clássico (Múltiplos Vencedores)
                    </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label>Modo de Exibição</Label>
                <Select
                    onValueChange={(val) => update("displayMode", val as "photo_and_names" | "names_only")}
                    value={hasTies ? "names_only" : (config.displayMode || "photo_and_names")}
                    disabled={config.layoutStyle === "modern" || hasTies}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="photo_and_names">Foto + Nome</SelectItem>
                        <SelectItem value="names_only">Apenas Nomes</SelectItem>
                    </SelectContent>
                </Select>
                {config.layoutStyle === "modern" && (
                    <p className="text-[10px] text-muted-foreground mt-1">Fixo em Foto + Nome</p>
                )}
                {hasTies && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">Forçado para Apenas Nomes (Empate)</p>
                )}
            </div>
            <div className="grid gap-2">
                <Label>Cor do Título (Ex: #FFFFFF)</Label>
                <Input
                    value={config.titleColor}
                    onChange={(e) => update("titleColor", e.target.value)}
                    placeholder="#FFFFFF"
                />
            </div>
            <div className="grid gap-2">
                <Label>Cor do Subtítulo (Ex: #FBBF24)</Label>
                <Input
                    value={config.subtitleColor}
                    onChange={(e) => update("subtitleColor", e.target.value)}
                    placeholder="#FBBF24"
                />
            </div>
            <div className="grid gap-2">
                <Label>Cor dos Nomes</Label>
                <Input
                    value={config.namesColor}
                    onChange={(e) => update("namesColor", e.target.value)}
                    placeholder="#FFFFFF"
                />
            </div>
            <div className="grid gap-2">
                <Label>Logo do Campeonato</Label>
                <div className="flex gap-2">
                    <Input
                        value={config.championshipLogoUrl || ""}
                        onChange={(e) => update("championshipLogoUrl", e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                    />
                    <input
                        type="file"
                        ref={logoInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={!!isUploading}
                    >
                        {isUploading === 'logo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <div className="grid gap-2 col-span-1 sm:col-span-2">
                <Label>Background do Banner</Label>
                <div className="flex gap-2">
                    <Input
                        value={config.backgroundUrl || ""}
                        onChange={(e) => update("backgroundUrl", e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                    />
                    <input
                        type="file"
                        ref={bgInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'background')}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => bgInputRef.current?.click()}
                        disabled={!!isUploading}
                    >
                        {isUploading === 'background' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Background Controls */}
            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 mt-2">
                <div className="grid gap-2">
                    <div className="flex justify-between">
                        <Label>Zoom ({config.backgroundScale ?? 100}%)</Label>
                    </div>
                    <Slider
                        defaultValue={[config.backgroundScale ?? 100]}
                        min={100}
                        max={300}
                        step={10}
                        onValueChange={(vals) => update("backgroundScale", vals[0])}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Posição X ({config.backgroundPosX ?? 50}%)</Label>
                    <Slider
                        defaultValue={[config.backgroundPosX ?? 50]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(vals) => update("backgroundPosX", vals[0])}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Posição Y ({config.backgroundPosY ?? 50}%)</Label>
                    <Slider
                        defaultValue={[config.backgroundPosY ?? 50]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(vals) => update("backgroundPosY", vals[0])}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Tamanho Texto ({config.customFontSizeOffset ?? 0}%)</Label>
                    <Slider
                        defaultValue={[config.customFontSizeOffset ?? 0]}
                        min={-5}
                        max={5}
                        step={0.5}
                        onValueChange={(vals) => update("customFontSizeOffset", vals[0])}
                    />
                </div>
            </div>
        </div>
    );
}
