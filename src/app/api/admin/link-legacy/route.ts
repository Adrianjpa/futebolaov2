import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
    // Security Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { legacyDocId, realUserId, championshipId } = body;

        if (!legacyDocId || !realUserId || !championshipId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Get Legacy Stats
        const { data: legacyStats, error: statsError } = await (supabaseAdmin
            .from("legacy_stats")
            .select("*")
            .eq("id", legacyDocId)
            .single() as any);

        if (statsError || !legacyStats) throw new Error("Legacy record not found");

        // 2. Link User ID in legacy_stats
        await (supabaseAdmin
            .from("legacy_stats") as any)
            .update({ user_id: realUserId })
            .eq("id", legacyDocId);

        // 3. Update Championship Settings (Participants & Winners)
        const { data: champ, error: champError } = await (supabaseAdmin
            .from("championships")
            .select("settings")
            .eq("id", championshipId)
            .single() as any);

        if (champ && champ.settings) {
            const settings = champ.settings as any;
            let updated = false;

            // Update Participants if they exist in settings
            if (settings.participants) {
                settings.participants = settings.participants.map((p: any) => {
                    if (p.userId === legacyStats.legacy_user_name || p.displayName === legacyStats.legacy_user_name) {
                        updated = true;
                        return { ...p, userId: realUserId, originalLegacyId: p.userId };
                    }
                    return p;
                });
            }

            // Update Winners
            if (legacyStats.rank === 1) {
                if (!settings.winners) settings.winners = [];
                const existingIndex = settings.winners.findIndex((w: any) => w.position === 'champion');
                if (existingIndex >= 0) {
                    settings.winners[existingIndex] = { ...settings.winners[existingIndex], userId: realUserId, displayName: legacyStats.legacy_user_name };
                } else {
                    settings.winners.push({ userId: realUserId, displayName: legacyStats.legacy_user_name, position: 'champion' });
                }
                updated = true;
            }

            if (updated) {
                await (supabaseAdmin
                    .from("championships") as any)
                    .update({ settings })
                    .eq("id", championshipId);
            }
        }

        // 4. Update User Profile (Legacy Stats summary)
        // We'll use a JSONB field in profiles if needed, or just link in legacy_stats (which we already did)
        // For now, linking in legacy_stats is sufficient for queries.

        return NextResponse.json({
            success: true,
            message: `Linked ${legacyStats.legacy_user_name} to user ${realUserId}.`
        });

    } catch (error: any) {
        console.error("Link Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
