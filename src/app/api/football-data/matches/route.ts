import { NextResponse } from "next/server";
import { supabaseAdmin, createServerSupabaseClient } from "@/lib/supabase-server";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const BASE_URL = "https://api.football-data.org/v4";

export async function GET(request: Request) {
    try {
        // 0. Verify Admin Session
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
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const status = searchParams.get("status");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        if (!API_KEY) {
            console.warn("Warning: FOOTBALL_DATA_API_KEY is missing in environment variables.");
        }

        let url = "";
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);

        // Add season support
        const season = searchParams.get("season");
        if (season) params.append("season", season);

        if (code) {
            url = `${BASE_URL}/competitions/${code}/matches`;
        } else {
            // Global matches endpoint
            url = `${BASE_URL}/matches`;
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        console.log(`Fetching matches from: ${url} | Key present: ${!!API_KEY}`);

        // The inner try-catch block is removed as per the instruction to consolidate error handling
        const response = await fetch(url, {
            headers: {
                "X-Auth-Token": API_KEY || "",
            },
            next: { revalidate: 15 }, // Cache for 15s to protect rate limit
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData.message || "Failed to fetch matches" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
