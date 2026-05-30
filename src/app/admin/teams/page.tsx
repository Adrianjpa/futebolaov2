"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Shield, Search, MoreHorizontal, Edit, Trash2, Merge } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Team {
    id: string;
    name: string;
    shortName: string;
    shieldUrl: string;
    type: "club" | "national";
}

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Add/Edit Dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [newName, setNewName] = useState("");
    const [newShortName, setNewShortName] = useState("");
    const [newShieldUrl, setNewShieldUrl] = useState("");
    const [newType, setNewType] = useState<"club" | "national">("club");

    // Delete Dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

    // Merge Dialog
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [mergePrimaryTeamId, setMergePrimaryTeamId] = useState<string>("");
    const [mergeDuplicateTeamIds, setMergeDuplicateTeamIds] = useState<string[]>([]);
    const [isMerging, setIsMerging] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("teams")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;

            setTeams((data as any[])?.map(t => ({
                id: t.id,
                name: t.name,
                shortName: t.short_name,
                shieldUrl: t.shield_url || t.crest_url || "",
                type: t.type
            })) || []);
        } catch (error) {
            console.error("Error fetching teams:", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddDialog = () => {
        setEditingTeam(null);
        setNewName("");
        setNewShortName("");
        setNewShieldUrl("");
        setNewType("club");
        setIsDialogOpen(true);
    };

    const openEditDialog = (team: Team) => {
        setEditingTeam(team);
        setNewName(team.name);
        setNewShortName(team.shortName);
        setNewShieldUrl(team.shieldUrl);
        setNewType(team.type || "club");
        setIsDialogOpen(true);
    };

    const handleSaveTeam = async () => {
        try {
            if (editingTeam) {
                const { error } = await supabase.from("teams").update({
                    name: newName,
                    short_name: newShortName,
                    shield_url: newShieldUrl,
                    type: newType,
                }).eq("id", editingTeam.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("teams").insert({
                    name: newName,
                    short_name: newShortName,
                    shield_url: newShieldUrl,
                    type: newType,
                });
                if (error) throw error;
            }

            setIsDialogOpen(false);
            fetchTeams();
        } catch (error: any) {
            console.error("Error saving team:", error);
            alert("Erro ao salvar equipe: " + (error.message || ""));
        }
    };

    const confirmDelete = (team: Team) => {
        setDeletingTeam(team);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteTeam = async () => {
        if (!deletingTeam) return;
        try {
            const { error } = await supabase.from("teams").delete().eq("id", deletingTeam.id);
            if (error) throw error;
            setIsDeleteDialogOpen(false);
            fetchTeams();
        } catch (error: any) {
            console.error("Error deleting team:", error);
            alert("Erro ao excluir equipe: " + (error.message || ""));
        }
    };

    const handleMergeTeams = async () => {
        if (!mergePrimaryTeamId || mergeDuplicateTeamIds.length === 0) {
            alert("Selecione a equipe principal e pelo menos uma duplicata.");
            return;
        }

        setIsMerging(true);
        try {
            const response = await fetch("/api/admin/teams/merge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryTeamId: mergePrimaryTeamId,
                    duplicateTeamIds: mergeDuplicateTeamIds
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erro ao unificar equipes");
            }

            setIsMergeDialogOpen(false);
            setMergePrimaryTeamId("");
            setMergeDuplicateTeamIds([]);
            fetchTeams();
            alert("Equipes unificadas com sucesso!");
        } catch (error: any) {
            console.error("Error merging teams:", error);
            alert("Erro ao unificar equipes: " + (error.message || ""));
        } finally {
            setIsMerging(false);
        }
    };

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipes</h1>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => setIsMergeDialogOpen(true)}>
                        <Merge className="mr-2 h-4 w-4" />
                        Unificar Duplicatas
                    </Button>
                    <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Equipe
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou sigla..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    Total: {filteredTeams.length} equipes
                </div>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Escudo</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Sigla</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando equipes...</TableCell>
                            </TableRow>
                        ) : filteredTeams.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhuma equipe encontrada.</TableCell>
                            </TableRow>
                        ) : (
                            filteredTeams.map((team) => (
                                <TableRow key={team.id}>
                                    <TableCell>
                                        <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                                            {team.shieldUrl ? (
                                                <img src={team.shieldUrl} alt={team.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{team.name}</TableCell>
                                    <TableCell>{team.shortName || "-"}</TableCell>
                                    <TableCell>
                                        <span className="text-xs px-2 py-1 bg-secondary rounded-full capitalize">
                                            {team.type === 'club' ? 'Clube' : 'Seleção'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(team)}>
                                                    <Edit className="mr-2 h-4 w-4 text-blue-500" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => confirmDelete(team)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Merge Dialog */}
            <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Merge className="h-5 w-5 text-purple-600" /> Unificar Duplicatas</DialogTitle>
                        <DialogDescription>
                            Selecione a equipe principal (a que vai permanecer) e as duplicatas (que serão excluídas). O sistema substituirá as duplicatas pelo nome da principal em todos os jogos e campeonatos do histórico.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-purple-800">1. Equipe Principal (A que vai ficar)</Label>
                            <Select value={mergePrimaryTeamId} onValueChange={(val) => {
                                setMergePrimaryTeamId(val);
                                // Remove from duplicates if selected
                                setMergeDuplicateTeamIds(prev => prev.filter(id => id !== val));
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a equipe principal" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {teams.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.type === 'club' ? 'Clube' : 'Seleção'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {mergePrimaryTeamId && (
                            <div className="space-y-2">
                                <Label className="font-bold text-red-700">2. Duplicatas a serem apagadas e mescladas (Selecione Várias)</Label>
                                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2 bg-slate-50">
                                    {teams.filter(t => t.id !== mergePrimaryTeamId).map(t => (
                                        <label key={t.id} className="flex items-center space-x-2 p-1 hover:bg-slate-100 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={mergeDuplicateTeamIds.includes(t.id)}
                                                onChange={(e) => {
                                                    if(e.target.checked) setMergeDuplicateTeamIds(prev => [...prev, t.id]);
                                                    else setMergeDuplicateTeamIds(prev => prev.filter(id => id !== t.id));
                                                }}
                                                className="accent-red-600"
                                            />
                                            <span className="text-sm">{t.name} <span className="text-xs text-muted-foreground">({t.type === 'club' ? 'Clube' : 'Seleção'})</span></span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{mergeDuplicateTeamIds.length} selecionadas para mesclagem.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)} disabled={isMerging}>Cancelar</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleMergeTeams} disabled={isMerging || !mergePrimaryTeamId || mergeDuplicateTeamIds.length === 0}>
                            {isMerging ? "Unificando..." : "Confirmar Unificação"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTeam ? "Editar Equipe" : "Adicionar Nova Equipe"}</DialogTitle>
                        <DialogDescription>
                            {editingTeam ? "Altere as informações da equipe selecionada." : "Cadastre uma nova equipe para usar no dicionário global."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Clube de Regatas do Flamengo" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="shortName">Nome Curto (Sigla)</Label>
                                <Input id="shortName" value={newShortName} onChange={(e) => setNewShortName(e.target.value)} placeholder="Ex: FLA" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="type">Tipo</Label>
                                <Select value={newType} onValueChange={(val: "club" | "national") => setNewType(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="club">Clube</SelectItem>
                                        <SelectItem value="national">Seleção</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="shieldUrl">URL do Escudo</Label>
                            <Input id="shieldUrl" value={newShieldUrl} onChange={(e) => setNewShieldUrl(e.target.value)} placeholder="https://..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTeam}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Excluir Equipe</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a equipe <strong>{deletingTeam?.name}</strong>? Essa ação não pode ser desfeita e pode afetar campeonatos que a utilizam.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteTeam}>Sim, Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
