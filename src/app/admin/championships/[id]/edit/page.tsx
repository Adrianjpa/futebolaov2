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
        try {
            const { name, category, status, ...others } = values;

            // Sanitize settings: Remove temporary input fields and convert Dates to strings
            const sanitizedSettings = {
                ...others,
                startDate: values.startDate ? values.startDate.toISOString() : null,
                endDate: values.endDate ? values.endDate.toISOString() : null,
            };

            // Remove helper fields that don't need to be in the database settings
            delete (sanitizedSettings as any).startDateInput;
            delete (sanitizedSettings as any).endDateInput;

            const { error } = await (supabase
                .from("championships") as any)
                .update({
                    name,
                    category,
                    status: status, // status is now already mapped by the Form
                    settings: sanitizedSettings as any
                })
                .eq("id", params.id as string);

            if (error) throw error;

            alert("Campeonato atualizado com sucesso!");
            router.push(`/admin/championships/${params.id}`);
        } catch (error: any) {
            console.error("Erro ao atualizar campeonato:", error);
            const msg = error.message || error.details || JSON.stringify(error);
            alert("Erro ao atualizar campeonato: " + msg);
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
