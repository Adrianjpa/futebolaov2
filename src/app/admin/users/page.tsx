"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, Search, Filter, Shield, ShieldAlert, UserCheck, Key, Mail } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface UserProfile {
    id: string;
    nome: string;
    nickname: string;
    email: string;
    funcao: "admin" | "moderator" | "usuario";
    status: "ativo" | "bloqueado" | "pendente";
    foto_perfil: string | null;
    created_at: string;
}

const SUPER_ADMIN_EMAILS = ["adrianjpa@gmail.com"];

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const supabase = createClient();

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        let result = users;

        // Filter by Status
        if (statusFilter !== "all") {
            result = result.filter(u => u.status === statusFilter);
        }

        // Filter by Role
        if (roleFilter !== "all") {
            result = result.filter(u => u.funcao === roleFilter);
        }

        // Filter by Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.nome || "").toLowerCase().includes(lowerTerm) ||
                (u.nickname || "").toLowerCase().includes(lowerTerm) ||
                (u.email || "").toLowerCase().includes(lowerTerm)
            );
        }

        // Sort by Name
        result.sort((a, b) => {
            const nameA = a.nome || "";
            const nameB = b.nome || "";
            return nameA.localeCompare(nameB);
        });

        setFilteredUsers(result);
    }, [users, searchTerm, statusFilter, roleFilter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*");

            if (error) throw error;
            setUsers(data as UserProfile[]);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        const user = users.find(u => u.id === userId);
        if (user && SUPER_ADMIN_EMAILS.includes(user.email)) return;

        try {
            const { error } = await (supabase
                .from("profiles") as any)
                .update({ funcao: newRole as any })
                .eq("id", userId);

            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, funcao: newRole as any } : u));
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        const user = users.find(u => u.id === userId);
        if (user && SUPER_ADMIN_EMAILS.includes(user.email)) return;

        try {
            const { error } = await (supabase
                .from("profiles") as any)
                .update({ status: newStatus as any })
                .eq("id", userId);

            if (error) throw error;

            // Send Welcome Notification if activated
            if (newStatus === "ativo" && user?.status !== "ativo") {
                await (supabase.from("notifications") as any).insert({
                    user_id: userId,
                    title: "Bem-vindo ao FuteBolão! ⚽",
                    message: "Sua conta foi aprovada! Prepare seus palpites e boa sorte no ranking.",
                    type: "welcome",
                    meta: { show_modal: true }
                });
            }

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const toggleUser = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (SUPER_ADMIN_EMAILS.includes(user?.email || "")) return;

        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleAll = () => {
        const selectableUsers = filteredUsers.filter(u => !SUPER_ADMIN_EMAILS.includes(u.email));
        const selectableIds = selectableUsers.map(u => u.id);

        const allSelectableSelected = selectableIds.every(id => selectedUsers.includes(id));

        if (allSelectableSelected) {
            setSelectedUsers(prev => prev.filter(id => !selectableIds.includes(id)));
        } else {
            setSelectedUsers(prev => {
                const newSelection = new Set([...prev, ...selectableIds]);
                return Array.from(newSelection);
            });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) return;
        setIsDeleting(true);
        try {
            // Note: In Supabase, deleting from profiles needs proper RLS or Admin client
            // Since this is a Client Component, it depends on RLS or the user being an Admin
            const { error } = await (supabase
                .from("profiles") as any)
                .delete()
                .in("id", selectedUsers);

            if (error) throw error;

            setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
            setSelectedUsers([]);
            setIsDeleteOpen(false);
        } catch (error) {
            console.error("Error deleting users:", error);
            alert("Erro ao excluir usuários. Verifique suas permissões.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
                    <p className="text-muted-foreground">Visualize e gerencie todos os membros da plataforma.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedUsers.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDeleteOpen(true)}
                            className="mr-2 animate-in fade-in"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Selecionados ({selectedUsers.length})
                        </Button>
                    )}
                    <Badge variant="secondary" className="px-4 py-1.5 text-sm">
                        Total: {users.length}
                    </Badge>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Membros</CardTitle>
                    <CardDescription>
                        Lista completa de usuários registrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, apelido ou email..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filtrar Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <Shield className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filtrar Função" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Funções</SelectItem>
                                <SelectItem value="usuario">Usuário</SelectItem>
                                <SelectItem value="moderator">Moderador</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[300px]">Usuário</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} data-state={selectedUsers.includes(user.id) ? "selected" : undefined}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedUsers.includes(user.id)}
                                                    onCheckedChange={() => toggleUser(user.id)}
                                                    disabled={SUPER_ADMIN_EMAILS.includes(user.email)}
                                                    className={SUPER_ADMIN_EMAILS.includes(user.email) ? "opacity-50 cursor-not-allowed" : ""}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Link href={`/dashboard/profile/${user.id}`}>
                                                        <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                                            <AvatarImage src={user.foto_perfil || undefined} />
                                                            <AvatarFallback>{(user.nickname || user.nome || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/dashboard/profile/${user.id}`} className="font-bold hover:underline hover:text-primary transition-colors">
                                                                {user.nickname || user.nome}
                                                            </Link>
                                                            {user.foto_perfil?.includes("googleusercontent.com") ? (
                                                                <div title="Login com Google">
                                                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                                                        <path
                                                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                                            fill="#4285F4"
                                                                        />
                                                                        <path
                                                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                                            fill="#34A853"
                                                                        />
                                                                        <path
                                                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                                            fill="#FBBC05"
                                                                        />
                                                                        <path
                                                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                                            fill="#EA4335"
                                                                        />
                                                                        <path d="M1 1h22v22H1z" fill="none" />
                                                                    </svg>
                                                                </div>
                                                            ) : (
                                                                <div title="Login com Email/Senha">
                                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="hidden sm:inline">{user.email}</span>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <div
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="sm:hidden cursor-pointer p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
                                                                    >
                                                                        <Mail className="h-3 w-3" />
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-2 text-xs" side="top">
                                                                    {user.email}
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy") : "-"}</span>
                                                    <span className="text-xs text-muted-foreground">{user.created_at ? format(new Date(user.created_at), "HH:mm") : ""}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={user.funcao}
                                                    onValueChange={(v) => handleRoleChange(user.id, v)}
                                                    disabled={SUPER_ADMIN_EMAILS.includes(user.email)}
                                                >
                                                    <SelectTrigger className="h-8 w-[130px] text-xs">
                                                        <div className="flex items-center gap-2">
                                                            {user.funcao === "admin" && <ShieldAlert className="h-3 w-3 text-red-500" />}
                                                            {user.funcao === "moderator" && <Shield className="h-3 w-3 text-blue-500" />}
                                                            {user.funcao === "usuario" && <UserCheck className="h-3 w-3 text-green-500" />}
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="usuario">Usuário</SelectItem>
                                                        <SelectItem value="moderator">Moderador</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={user.status}
                                                    onValueChange={(v) => handleStatusChange(user.id, v)}
                                                    disabled={SUPER_ADMIN_EMAILS.includes(user.email)}
                                                >
                                                    <SelectTrigger className={`h-8 w-[110px] text-xs border-none font-medium transition-colors ${user.status === 'ativo' ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20' :
                                                        user.status === 'bloqueado' ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20' :
                                                            'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20'
                                                        }`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'ativo' ? 'bg-green-500' :
                                                                user.status === 'bloqueado' ? 'bg-red-500' :
                                                                    'bg-yellow-500'
                                                                }`} />
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ativo">Ativo</SelectItem>
                                                        <SelectItem value="pendente">Pendente</SelectItem>
                                                        <SelectItem value="bloqueado">Bloqueado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Usuários</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir <strong>{selectedUsers.length}</strong> usuário(s)? Essa ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Excluir"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
