import { createServerSupabaseClient, supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        // 1. Verify User is Admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await (supabaseAdmin
            .from("profiles") as any)
            .select("funcao")
            .eq("id", user.id)
            .single();

        if (profile?.funcao !== 'admin' && profile?.funcao !== 'moderator') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        // 2. Process Request
        const body = await request.json();
        const { id, name, short_name, shield_url, type, overwrite } = body;

        // Fallback for short_name to avoid DB constraint error
        const finalShortName = short_name || (name ? name.substring(0, 3).toUpperCase() : "TMP");

        if (overwrite && id) {
            const { data, error } = await (supabaseAdmin
                .from("teams") as any)
                .update({ name, short_name: finalShortName, shield_url, type })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json(data);
        } else {
            // Check for existing by name first (extra safety)
            const { data: existing } = await (supabaseAdmin
                .from("teams") as any)
                .select("*")
                .ilike("name", name)
                .single();

            if (existing && !overwrite) {
                return NextResponse.json({ error: "Team already exists", team: existing }, { status: 409 });
            }

            const { data, error } = await (supabaseAdmin
                .from("teams") as any)
                .insert({ name, short_name: finalShortName, shield_url, type })
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json(data);
        }

    } catch (error: any) {
        console.error("Admin Teams API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
