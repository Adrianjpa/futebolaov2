import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.from('public_profiles').select('*').neq('funcao', 'teste');
        if (error) throw error;
        
        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error fetching public profiles:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
