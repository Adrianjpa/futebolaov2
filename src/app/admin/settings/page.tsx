"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";

interface SystemSettings {
    maintenanceMode: boolean;
    lockDate?: string;
    lockTime?: string;
    maintenanceTitle?: string;
    maintenanceMessage?: string;
    returnDate?: string;
    returnTime?: string;
    announcement: string;
    apiKey?: string;
    apiUpdateInterval?: number; // Minutes
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        maintenanceMode: false,
        lockDate: "",
        lockTime: "",
        maintenanceTitle: "Manutenção em Andamento",
        maintenanceMessage: "Estamos realizando melhorias no sistema.",
        returnDate: "",
        returnTime: "",
        announcement: "",
        apiKey: "",
        apiUpdateInterval: 3
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await (supabase
                    .from("system_settings")
                    .select("data")
                    .eq("id", "config")
                    .single() as any);

                if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows found'

                if (data) {
                    setSettings(data.data as SystemSettings);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [supabase]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await (supabase
                .from("system_settings") as any)
                .update({ data: settings })
                .eq('id', 'config');

            if (error) throw error;
            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>

            <div className="grid gap-6">
                <Card className={settings.maintenanceMode ? "border-yellow-500/50" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Modo de Manutenção
                            {settings.maintenanceMode && <Badge className="bg-yellow-500 text-black">ATIVO</Badge>}
                        </CardTitle>
                        <CardDescription>Trava o acesso de usuários comuns enquanto o Admin trabalha.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Bloqueio Imediato</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Trava o sistema agora, independente de agenda.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.maintenanceMode}
                                        onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                                    />
                                </div>

                                <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-xs space-y-2">
                                    <p className="font-bold text-yellow-500 flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Como funciona a Automação:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground italic">
                                        <li>Se você definir <b>Início</b>, o sistema trava sozinho no horário.</li>
                                        <li>Se você definir <b>Retorno</b>, o sistema <u>libera sozinho</u> no horário.</li>
                                        <li>O bloqueio imediato (acima) ignora todos os horários.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Agendamento Automático</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">Data de Início</Label>
                                        <Input
                                            type="date"
                                            value={settings.lockDate}
                                            onChange={e => setSettings({ ...settings, lockDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">Hora de Início</Label>
                                        <Input
                                            type="time"
                                            value={settings.lockTime}
                                            onChange={e => setSettings({ ...settings, lockTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-xs">Data de Retorno</Label>
                                        <Input
                                            type="date"
                                            value={settings.returnDate}
                                            onChange={e => setSettings({ ...settings, returnDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs">Hora de Retorno</Label>
                                        <Input
                                            type="time"
                                            value={settings.returnTime}
                                            onChange={e => setSettings({ ...settings, returnTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-muted">
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Alerta</Label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Título do Alerta</Label>
                                    <Input
                                        value={settings.maintenanceTitle}
                                        onChange={e => setSettings({ ...settings, maintenanceTitle: e.target.value })}
                                        placeholder="Ex: Manutenção Programada"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Mensagem Explicativa</Label>
                                    <Textarea
                                        className="h-[42px] min-h-[42px]"
                                        value={settings.maintenanceMessage}
                                        onChange={e => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                                        placeholder="Descreva o motivo da manutenção..."
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Anúncios</CardTitle>
                        <CardDescription>Mensagem exibida no topo do dashboard para todos os usuários.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="announcement">Mensagem do Sistema</Label>
                            <Textarea
                                id="announcement"
                                placeholder="Ex: O sistema passará por manutenção às 22h."
                                value={settings.announcement}
                                onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Integrações</CardTitle>
                        <CardDescription>Chaves de API e configurações externas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">


                        <div className="space-y-2">
                            <Label htmlFor="apiUpdateInterval">Intervalo de Atualização Automática (minutos)</Label>
                            <Input
                                id="apiUpdateInterval"
                                type="number"
                                min="1"
                                placeholder="Ex: 3"
                                value={settings.apiUpdateInterval || 3}
                                onChange={(e) => setSettings({ ...settings, apiUpdateInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Tempo entre as chamadas automáticas para atualizar placares (Mínimo: 1 minuto).
                            </p>
                        </div>


                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
