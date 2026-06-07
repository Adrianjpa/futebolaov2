"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, FileText, User as UserIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
    id: string;
    action: string;
    details: any;
    created_at: string;
    profiles?: {
        nome: string;
        nickname: string;
        email: string;
    };
}

export default function LogsPage() {
    const supabase = createClient();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("all");
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [matchesDict, setMatchesDict] = useState<Map<string, { home: string, away: string, champName: string }>>(new Map());

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("activity_logs")
                    .select("id, action, details, created_at, profiles(nome, nickname, email)")
                    .order("created_at", { ascending: false })
                    .limit(200);

                if (error) {
                    if (error.code === '42P01') {
                        // Table doesn't exist yet
                        setLogs([]);
                    } else {
                        throw error;
                    }
                } else {
                    setLogs(data as any || []);
                }
                
                // Fetch matches dictionary
                const { data: matches } = await supabase.from('matches').select('id, home_team, away_team, championships(name)');
                const mDict = new Map();
                if (matches) {
                    matches.forEach((m: any) => mDict.set(m.id, { home: m.home_team, away: m.away_team, champName: m.championships?.name }));
                }
                setMatchesDict(mDict);
            } catch (err: any) {
                console.error("Erro ao buscar logs:", err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [supabase]);

    const getEffectiveAction = (log: LogEntry) => {
        if (log.action === 'place_bet' && log.details) {
            const details = log.details;
            if (details.old_home !== undefined || details["Old Home"] !== undefined || details.Tipo === "Alterou Palpite Existente") {
                return 'update_bet';
            }
        }
        return log.action;
    };

    const filteredLogs = logs.filter(log => {
        const effectiveAction = getEffectiveAction(log);
        const matchesAction = filterAction === "all" || effectiveAction === filterAction;
        const searchStr = `${log.profiles?.nome || ""} ${log.profiles?.nickname || ""} ${log.profiles?.email || ""} ${effectiveAction}`.toLowerCase();
        const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
        return matchesAction && matchesSearch;
    });

    const uniqueActions = Array.from(new Set(logs.map(l => getEffectiveAction(l))));

    const getActionBadgeColor = (action: string) => {
        if (action === "update_bet") return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        if (action.includes("update") || action.includes("edit")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        if (action.includes("delete") || action.includes("remove")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
        if (action.includes("create") || action.includes("insert") || action.includes("bet")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        if (action.includes("login")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    };

    const getActionLabel = (action: string) => {
        switch(action) {
            case 'login': return 'Login';
            case 'update_profile': return 'Atualizou Perfil';
            case 'place_bet': return 'Realizou Palpite';
            case 'update_bet': return 'Alterou Palpite';
            case 'send_message': return 'Enviou Mensagem';
            case 'update_presence': return 'Mudou Presença';
            case 'update_status': return 'Status Alterado';
            case 'update_selections': return 'Escolheu Campeões';
            default: return action;
        }
    }

    const formatLogDetails = (details: any) => {
        if (!details) return <p className="text-muted-foreground italic">Sem detalhes adicionais</p>;
        
        const isPredictionLog = details["Match Id"] || details.match_id || details["Tipo"]?.includes("Palpite");

        if (isPredictionLog) {
            const matchId = details["Match Id"] || details.match_id;
            const matchInfo = matchesDict.get(matchId);
            const matchName = matchInfo ? `${matchInfo.home} x ${matchInfo.away} (${matchInfo.champName})` : `ID: ${matchId}`;

            const hasOldScore = details.old_home !== undefined || details["Old Home"] !== undefined;

            return (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1 border-b pb-3">
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Jogo</span>
                        <span className="font-bold text-lg">{matchName}</span>
                    </div>

                    {!hasOldScore ? (
                         <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30 text-center">
                            <span className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-2 block">Placar Salvo</span>
                            {(details.home_score !== undefined || details["Home Score"] !== undefined) ? (
                                <span className="text-3xl font-mono font-bold text-green-700 dark:text-green-300">
                                    {details.home_score ?? details["Home Score"]} - {details.away_score ?? details["Away Score"]}
                                </span>
                            ) : (
                                <span className="text-sm italic text-muted-foreground">Sem dados de placar</span>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                <span className="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1 block">Antes</span>
                                <span className="text-xl font-mono">{details.old_home ?? details["Old Home"]} - {details.old_away ?? details["Old Away"]}</span>
                            </div>

                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                <span className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-1 block">Depois</span>
                                {(details.home_score !== undefined || details["Home Score"] !== undefined) ? (
                                    <span className="text-xl font-mono font-bold text-green-700 dark:text-green-300">{details.home_score ?? details["Home Score"]} - {details.away_score ?? details["Away Score"]}</span>
                                ) : (
                                    <span className="text-sm italic text-muted-foreground">Sem dados de placar</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-2">
                {Object.entries(details).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center py-1 border-b border-border/50 last:border-0">
                        <span className="font-semibold text-muted-foreground capitalize w-1/3 min-w-[120px]">
                            {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-mono text-sm break-all">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
                    <p className="text-muted-foreground text-sm">
                        Registro de atividades de usuários (Audit Trail).
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                        <div>
                            <CardTitle>Histórico de Atividades</CardTitle>
                            <CardDescription>
                                Exibindo as últimas {logs.length} ações registradas.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar usuário..."
                                    className="pl-8 w-full sm:w-[200px]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={filterAction} onValueChange={setFilterAction}>
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="Tipo de Ação" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as ações</SelectItem>
                                    {uniqueActions.map(action => (
                                        <SelectItem key={action} value={action}>{getActionLabel(action)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {logs.length === 0 ? (
                                <div className="space-y-3">
                                    <p>A tabela de logs ainda está vazia ou não foi criada.</p>
                                    <p className="text-xs">Para habilitar, execute o arquivo <code className="bg-muted px-1 rounded">setup_logs.sql</code> no SQL Editor do Supabase.</p>
                                </div>
                            ) : "Nenhum log encontrado para os filtros selecionados."}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Data e Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead className="text-right">Detalhes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm truncate max-w-[150px] sm:max-w-[200px]">
                                                            {log.profiles?.nickname || log.profiles?.nome || "Sistema / Desconhecido"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                                                            {log.profiles?.email || "Sem e-mail"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getActionBadgeColor(getEffectiveAction(log))} font-normal`} variant="secondary">
                                                    {getActionLabel(getEffectiveAction(log))}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                                            <FileText className="h-4 w-4 mr-1" />
                                                            <span className="hidden sm:inline">Ver Detalhes</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Detalhes da Ação</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 pt-4">
                                                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                                                                <div>
                                                                    <span className="text-muted-foreground block text-xs">Usuário:</span>
                                                                    <span className="font-medium">{selectedLog?.profiles?.nome}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground block text-xs">Ação:</span>
                                                                    <Badge className={`${getActionBadgeColor(selectedLog ? getEffectiveAction(selectedLog) : "")} font-normal mt-1`} variant="secondary">
                                                                        {getActionLabel(selectedLog ? getEffectiveAction(selectedLog) : "")}
                                                                    </Badge>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground block text-xs">Data:</span>
                                                                    <span>{selectedLog && format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground block text-xs mb-2">Detalhes da Ação:</span>
                                                                <div className="bg-background border rounded-lg p-4 text-sm">
                                                                    {formatLogDetails(selectedLog?.details)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
