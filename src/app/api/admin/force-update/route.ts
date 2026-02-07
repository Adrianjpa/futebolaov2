import { NextResponse } from "next/server";
import { supabaseAdmin, createServerSupabaseClient } from "@/lib/supabase-server";
import { syncMatchesFromExternalApi } from "@/lib/sync-service";

export async function POST(request: Request) {
    try {
        // 1. Verify Admin Session
        const supabase = await createServerSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await (supabaseAdmin
            .from("profiles")
            .select("funcao")
            .eq("id", session.user.id)
            .single() as any);

        if (profile?.funcao !== 'admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        console.log("Admin forcing manual update...");

        // 2. Perform Real Sync (Force Mode = true)
        const result = await syncMatchesFromExternalApi(true);

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json({
            ...result,
            message: (result as any).message || ((result as any).updates > 0
                ? `Sucesso! ${(result as any).updates} partidas atualizadas: ${(result as any).updatedNames.join(', ')}`
                : `Tudo atualizado! (API retornou ${(result as any).apiMatchCount} jogos no total)`)
        });

    } catch (error: any) {
        console.error("Force Update Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
