"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ChampionshipForm, ChampionshipFormData } from "@/components/admin/ChampionshipForm";

export default function NewChampionshipPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const supabase = createClient();

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

            console.log("Inserindo campeonato:", { name, category, status, settings: sanitizedSettings });

            const { data, error } = await (supabase.from("championships") as any).insert({
                name,
                category,
                status: status || "agendado",
                settings: sanitizedSettings
            }).select().single();

            if (error) {
                console.error("Erro Supabase:", error);
                throw error;
            }

            alert("Campeonato criado com sucesso!");
            if (data?.id) {
                router.push(`/admin/championships/${data.id}`);
            } else {
                router.push("/admin/championships");
            }
        } catch (error: any) {
            console.error("Erro completo ao criar campeonato:", error);
            // Better error message showing the Supabase error details if available
            const msg = error.message || error.details || JSON.stringify(error);
            alert("Erro ao criar campeonato: " + msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Novo Campeonato</h1>
            </div>

            <ChampionshipForm onSubmit={onSubmit} isSubmitting={isSubmitting} submitLabel="Criar Campeonato" />
        </div>
    );
}
