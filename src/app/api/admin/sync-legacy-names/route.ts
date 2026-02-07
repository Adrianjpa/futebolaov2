import { NextResponse } from "next/server";
import { createServerSupabaseClient, supabaseAdmin } from "@/lib/supabase-server";

export async function POST() {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Admin
    const { data: profile } = await (supabase
        .from("profiles")
        .select("funcao")
        .eq("id", session.user.id)
        .single() as any);

    if (profile?.funcao !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // 1. Fetch all championships
        const { data: championships } = await (supabaseAdmin.from("championships").select("*") as any);

        const legacyRecords: any[] = [];

        for (const champ of championships) {
            const settings = champ.settings || {};
            const participants = settings.participants || [];

            for (const p of participants) {
                const name = p.nickname || p.displayName || p.nome || p.userId;
                // If it looks like a name (not a UUID) and isn't already linked
                if (name && name.length < 50 && !name.includes("-")) {
                    // Check if already in legacy_stats
                    const { data: existing } = await (supabaseAdmin
                        .from("legacy_stats")
                        .select("id")
                        .eq("legacy_user_name", name)
                        .eq("championship_id", champ.id) as any);

                    if (!existing || existing.length === 0) {
                        legacyRecords.push({
                            championship_id: champ.id,
                            championship_name: champ.name,
                            legacy_user_name: name,
                            points: p.points || 0,
                            rank: p.rank || 0,
                            year: champ.name.match(/\d{4}/)?.[0] || ""
                        });
                    }
                }
            }
        }

        if (legacyRecords.length > 0) {
            const { error } = await (supabaseAdmin.from("legacy_stats") as any).insert(legacyRecords);
            if (error) throw error;
        }

        return NextResponse.json({
            success: true,
            message: `Sincronização concluída. ${legacyRecords.length} nomes encontrados.`
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
