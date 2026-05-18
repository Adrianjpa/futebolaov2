import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { syncMatchesFromExternalApi } from "@/lib/sync-service";

export async function POST(request: Request) {
    try {
        // 1. Get current config
        const { data: settingsData, error: settingsError } = await (supabaseAdmin
            .from("system_settings") as any)
            .select("data, updated_at")
            .eq("id", "config")
            .single();

        if (settingsError) {
            return NextResponse.json({ success: false, error: "Config not found" }, { status: 500 });
        }

        const lastUpdate = new Date(settingsData.updated_at).getTime();
        const intervalMinutes = settingsData.data?.apiUpdateInterval || 3;
        const now = new Date().getTime();

        const msSinceLastUpdate = now - lastUpdate;
        const intervalMs = intervalMinutes * 60 * 1000;

        // 2. Check if we actually need to sync
        // Add a 10-second buffer to prevent race conditions from concurrent clients
        if (msSinceLastUpdate >= (intervalMs - 10000)) {
            // Immediately update the timestamp to lock out other concurrent requests
            await (supabaseAdmin
                .from("system_settings") as any)
                .update({ updated_at: new Date().toISOString() })
                .eq("id", "config");

            console.log(`[Public Sync] Triggered by client. Last update was ${Math.round(msSinceLastUpdate / 1000)}s ago.`);
            
            // Perform Sync
            const result = await syncMatchesFromExternalApi(false);
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ 
                success: true, 
                message: "Sync not needed yet.", 
                timeRemainingMs: intervalMs - msSinceLastUpdate 
            });
        }

    } catch (error: any) {
        console.error("Public Sync Route Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
