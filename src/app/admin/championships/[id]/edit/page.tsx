"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChampionshipForm, ChampionshipFormData } from "@/components/admin/ChampionshipForm";
import { Loader2 } from "lucide-react";

export default function EditChampionshipPage() {
    const params = useParams();
    const router = useRouter();
    const [championship, setChampionship] = useState<Partial<ChampionshipFormData> | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const fetchChampionship = async () => {
            if (!params.id) return;
            try {
                const { data, error } = await supabase
                    .from("championships")
                    .select("*")
                    .eq("id", params.id as string)
                    .single();

                if (error) throw error;

                if (data) {
                    const { settings, ...rest } = data as any;
                    setChampionship({ ...rest, ...(settings as any) });
                } else {
                    alert("Campeonato não encontrado");
                    router.push("/admin/championships");
                }
            } catch (error) {
                console.error("Error fetching championship:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChampionship();
    }, [params.id, router, supabase]);

    const onSubmit = async (values: ChampionshipFormData) => {
        setIsSubmitting(true);
        const { name, category, status, ...others } = values;
        // Map form status to DB status
        let dbStatus: "ativo" | "finalizado" | "arquivado" = "ativo";
        if (status === "finished") dbStatus = "finalizado";
        else if (status === "arquivado") dbStatus = "arquivado";

        try {
            const { error } = await (supabase
                .from("championships") as any)
                .update({
                    name,
                    category,
                    status: dbStatus,
                    settings: others as any
                })
                .eq("id", params.id as string);

            if (error) throw error;

            alert("Campeonato atualizado com sucesso!");
            router.push(`/admin/championships/${params.id}`);
        } catch (error) {
            console.error("Erro ao atualizar campeonato:", error);
            alert("Erro ao atualizar campeonato.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!championship) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Editar Campeonato</h1>
            </div>

            <ChampionshipForm
                initialData={championship}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Salvar Alterações"
            />
        </div>
    );
}
