import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with service role key to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const matchId = url.searchParams.get("matchId");
        const userId = url.searchParams.get("userId");

        if (!matchId || !userId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const { data: logs, error } = await supabaseAdmin
            .from("activity_logs")
            .select("created_at")
            .eq("user_id", userId)
            .eq("action", "place_bet")
            .contains("details", { match_id: matchId })
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (logs && logs.length > 0) {
            return NextResponse.json({ timestamp: logs[0].created_at }, { status: 200 });
        } else {
            return NextResponse.json({ timestamp: null }, { status: 200 });
        }
    } catch (error: any) {
        console.error("Error fetching prediction timestamp:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
