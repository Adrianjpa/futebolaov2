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
        const { name, category, status, ...others } = values;
        try {
            const { data, error } = await supabase.from("championships").insert({
                name,
                category,
                status: "ativo", // Force active on creation
                settings: others
            }).select().single();

            if (error) throw error;

            alert("Campeonato criado com sucesso!");
            if (data?.id) {
                router.push(`/admin/championships/${data.id}`);
            } else {
                router.push("/admin/championships");
            }
        } catch (error) {
            console.error("Erro ao criar campeonato:", error);
            alert("Erro ao criar campeonato.");
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
