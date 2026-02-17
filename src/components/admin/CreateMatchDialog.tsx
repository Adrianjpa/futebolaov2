"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Plus, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

interface CreateMatchDialogProps {
    championshipId: string;
    onMatchCreated: () => void;
}

export function CreateMatchDialog({ championshipId, onMatchCreated }: CreateMatchDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [existingTeams, setExistingTeams] = useState<{ name: string; crest: string | null }[]>([]);
    const [existingRounds, setExistingRounds] = useState<{ round: number; name: string | null }[]>([]);

    // Form State
    const [homeTeam, setHomeTeam] = useState("");
    const [awayTeam, setAwayTeam] = useState("");
    const [homeCrest, setHomeCrest] = useState("");
    const [awayCrest, setAwayCrest] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState("16:00");
    const [round, setRound] = useState<string>("");
    const [roundName, setRoundName] = useState("");

    // Autocomplete UI State
    const [openHomeCombo, setOpenHomeCombo] = useState(false);
    const [openAwayCombo, setOpenAwayCombo] = useState(false);
    const [openRoundCombo, setOpenRoundCombo] = useState(false);

    const supabase = createClient();

    // Fetch existing data for autocomplete
    useEffect(() => {
        if (!open) return;

        const fetchData = async () => {
            // 1. Fetch matches for existing data pattern
            const matchesPromise = (supabase
                .from("matches") as any)
                .select("home_team, away_team, home_team_crest, away_team_crest, round, round_name")
                .eq("championship_id", championshipId);

            // 2. Fetch championship settings for pre-defined teams
            const champPromise = (supabase
                .from("championships") as any)
                .select("settings")
                .eq("id", championshipId)
                .single();

            const [matchesRes, champRes] = await Promise.all([matchesPromise, champPromise]);

            const teamsMap = new Map<string, string | null>();
            const roundsMap = new Map<number, string | null>();

            // Process Matches
            if (matchesRes.data) {
                matchesRes.data.forEach((m: any) => {
                    if (m.home_team) teamsMap.set(m.home_team, m.home_team_crest);
                    if (m.away_team) teamsMap.set(m.away_team, m.away_team_crest);
                    if (m.round) roundsMap.set(m.round, m.round_name);
                });
            }

            // Process Championship Settings (Teams)
            if (champRes.data?.settings?.teams && Array.isArray(champRes.data.settings.teams)) {
                champRes.data.settings.teams.forEach((t: any) => {
                    if (t.name) {
                        const existingCrest = teamsMap.get(t.name);
                        const settingCrest = t.shieldUrl || t.shield_url || t.crest;
                        // Use setting crest if match crest is null, or just add if not exists
                        if (!existingCrest) {
                            teamsMap.set(t.name, settingCrest || null);
                        }
                    }
                });
            }

            setExistingTeams(Array.from(teamsMap.entries()).map(([name, crest]) => ({ name, crest })).sort((a, b) => a.name.localeCompare(b.name)));
            setExistingRounds(Array.from(roundsMap.entries()).map(([round, name]) => ({ round, name })).sort((a, b) => a.round - b.round));
        };

        fetchData();
    }, [open, championshipId, supabase]);

    const handleSelectTeam = (name: string, isHome: boolean) => {
        const team = existingTeams.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (isHome) {
            setHomeTeam(team ? team.name : name);
            if (team?.crest) setHomeCrest(team.crest || "");
            setOpenHomeCombo(false);
        } else {
            setAwayTeam(team ? team.name : name);
            if (team?.crest) setAwayCrest(team.crest || "");
            setOpenAwayCombo(false);
        }
    };

    const handleSelectRound = (rId: string) => {
        const r = existingRounds.find(er => er.round.toString() === rId);
        if (r) {
            setRound(r.round.toString());
            setRoundName(r.name || "");
            setOpenRoundCombo(false);
        }
    };

    const handleSubmit = async () => {
        if (!homeTeam || !awayTeam || !date || !round) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        setLoading(true);
        try {
            // Combine date and time
            const [hours, minutes] = time.split(":").map(Number);
            const fullDate = new Date(date);
            fullDate.setHours(hours, minutes, 0, 0);

            const { error } = await (supabase.from("matches") as any).insert({
                championship_id: championshipId,
                home_team: homeTeam,
                away_team: awayTeam,
                home_team_crest: homeCrest || null,
                away_team_crest: awayCrest || null,
                date: fullDate.toISOString(),
                round: parseInt(round),
                round_name: roundName || null,
                status: "scheduled",
                external_id: `manual-${Date.now()}`
            });

            if (error) throw error;

            alert("Jogo criado com sucesso!");
            setOpen(false);
            onMatchCreated();

            // Reset form
            setHomeTeam("");
            setAwayTeam("");
            setHomeCrest("");
            setAwayCrest("");
            setRound("");
            setRoundName("");

        } catch (error: any) {
            console.error("Error creating match:", error);
            alert(`Erro ao criar jogo: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Jogo Manual
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Adicionar Jogo Manualmente</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do jogo. Use as sugestões para manter a consistência com a API.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Home Team */}
                    <div className="grid gap-2">
                        <Label>Time da Casa (Mandante)</Label>
                        <div className="flex gap-2">
                            <Popover open={openHomeCombo} onOpenChange={setOpenHomeCombo}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={openHomeCombo} className="flex-1 justify-between">
                                        {homeTeam || "Selecionar ou digitar time..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar time..." onValueChange={(val) => setHomeTeam(val)} />
                                        <CommandList>
                                            <CommandEmpty>
                                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setHomeTeam(homeTeam); setOpenHomeCombo(false); }}>
                                                    Usar "{homeTeam}"
                                                </Button>
                                            </CommandEmpty>
                                            <CommandGroup heading="Times Existentes">
                                                {existingTeams.map((team) => (
                                                    <CommandItem
                                                        key={team.name}
                                                        value={team.name}
                                                        onSelect={() => handleSelectTeam(team.name, true)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", homeTeam === team.name ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex items-center gap-2">
                                                            {team.crest && <img src={team.crest} className="h-4 w-4 object-contain" alt="" />}
                                                            {team.name}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Input
                            placeholder="URL do Escudo (Opcional)"
                            value={homeCrest}
                            onChange={(e) => setHomeCrest(e.target.value)}
                            className="text-xs"
                        />
                    </div>

                    {/* Away Team */}
                    <div className="grid gap-2">
                        <Label>Time Visitante</Label>
                        <div className="flex gap-2">
                            <Popover open={openAwayCombo} onOpenChange={setOpenAwayCombo}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={openAwayCombo} className="flex-1 justify-between">
                                        {awayTeam || "Selecionar ou digitar time..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar time..." onValueChange={(val) => setAwayTeam(val)} />
                                        <CommandList>
                                            <CommandEmpty>
                                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setAwayTeam(awayTeam); setOpenAwayCombo(false); }}>
                                                    Usar "{awayTeam}"
                                                </Button>
                                            </CommandEmpty>
                                            <CommandGroup heading="Times Existentes">
                                                {existingTeams.map((team) => (
                                                    <CommandItem
                                                        key={team.name}
                                                        value={team.name}
                                                        onSelect={() => handleSelectTeam(team.name, false)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", awayTeam === team.name ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex items-center gap-2">
                                                            {team.crest && <img src={team.crest} className="h-4 w-4 object-contain" alt="" />}
                                                            {team.name}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Input
                            placeholder="URL do Escudo (Opcional)"
                            value={awayCrest}
                            onChange={(e) => setAwayCrest(e.target.value)}
                            className="text-xs"
                        />
                    </div>

                    {/* Round */}
                    <div className="grid gap-2">
                        <Label>Rodada</Label>
                        <div className="flex gap-2">
                            <Popover open={openRoundCombo} onOpenChange={setOpenRoundCombo}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={openRoundCombo} className="flex-1 justify-between">
                                        {round ? (roundName ? `${round} - ${roundName}` : `Rodada ${round}`) : "Selecionar Rodada..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar rodada..." onValueChange={(val) => {
                                            // Try to parse number if user types manually
                                            if (!isNaN(parseInt(val))) setRound(val);
                                        }} />
                                        <CommandList>
                                            <CommandEmpty>Digite o número da rodada se for nova.</CommandEmpty>
                                            <CommandGroup heading="Rodadas Existentes">
                                                {existingRounds.map((r) => (
                                                    <CommandItem
                                                        key={r.round}
                                                        value={r.round.toString()}
                                                        onSelect={handleSelectRound}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", round === r.round.toString() ? "opacity-100" : "opacity-0")} />
                                                        Rodada {r.round} {r.name ? `(${r.name})` : ""}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Input
                                type="number"
                                placeholder="Nº"
                                className="w-20"
                                value={round}
                                onChange={(e) => setRound(e.target.value)}
                            />
                        </div>
                        <Input
                            placeholder="Nome da Rodada (ex: Final)"
                            value={roundName}
                            onChange={(e) => setRoundName(e.target.value)}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Data</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "P") : <span>Selecione a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label>Horário</Label>
                            <Input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Criar Jogo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
