import { NextResponse } from "next/server";
import { createServerSupabaseClient, supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify if user is admin
    const { data: profile } = await (supabase
        .from("profiles")
        .select("funcao")
        .eq("id", session.user.id)
        .single() as any);

    if (profile?.funcao !== "admin") {
        return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { sourceUserId, targetUserId } = body;

        if (!sourceUserId || !targetUserId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Get Source Profile (Legacy)
        const { data: legacyProfile, error: lpError } = await (supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", sourceUserId)
            .single() as any);

        if (lpError || !legacyProfile) throw new Error("Legacy profile not found");

        const legacyName = legacyProfile.nome || legacyProfile.nickname;

        console.log(`Migrating data from ${legacyProfile.email} (${sourceUserId}) to ${targetUserId}`);

        // 2. Update all relational tables
        // Predictions
        const { error: predError } = await (supabaseAdmin
            .from("predictions") as any)
            .update({ user_id: targetUserId })
            .eq("user_id", sourceUserId);

        if (predError) console.error("Error updating predictions:", predError);

        // Participants
        const { error: partError } = await (supabaseAdmin
            .from("championship_participants") as any)
            .update({ user_id: targetUserId })
            .eq("user_id", sourceUserId);

        if (partError) console.error("Error updating participants:", partError);

        // Legacy Stats (if any)
        const { error: statsError } = await (supabaseAdmin
            .from("legacy_stats") as any)
            .update({ user_id: targetUserId })
            .eq("user_id", sourceUserId);

        if (statsError) console.error("Error updating legacy_stats:", statsError);

        // 3. Update Championship Settings (Participants, Winners, etc)
        const { data: championships } = await (supabaseAdmin
            .from("championships")
            .select("id, name, settings") as any);

        if (championships) {
            for (const champ of championships) {
                let settings = champ.settings || {};
                let updated = false;

                // Update Participants list in settings
                if (settings.participants && Array.isArray(settings.participants)) {
                    settings.participants = settings.participants.map((p: any) => {
                        const pid = p.userId || p.id || p.user_id;
                        // Match by ID OR by Name (if ID was originally the name)
                        if (pid === sourceUserId || p.displayName === legacyName || p.nome === legacyName) {
                            updated = true;
                            return { ...p, userId: targetUserId, originalLegacyId: pid };
                        }
                        return p;
                    });
                }

                // Update Winners
                if (settings.winners && Array.isArray(settings.winners)) {
                    settings.winners = settings.winners.map((w: any) => {
                        const wid = w.userId || w.id || w.user_id;
                        if (wid === sourceUserId || w.displayName === legacyName) {
                            updated = true;
                            return { ...w, userId: targetUserId };
                        }
                        return w;
                    });
                }

                if (updated) {
                    await (supabaseAdmin
                        .from("championships") as any)
                        .update({ settings })
                        .eq("id", champ.id);
                }
            }
        }

        // 4. Mark Legacy Profile as Migrated (don't delete it yet, but rename email to avoid conflicts and clutter)
        const newLegacyEmail = `migrated_${Date.now()}_${legacyProfile.email}`;
        await (supabaseAdmin
            .from("profiles") as any)
            .update({
                email: newLegacyEmail,
                status: 'bloqueado', // Deactivate the legacy profile
                nickname: `Legacy: ${legacyProfile.nickname || legacyProfile.nome}`
            })
            .eq("id", sourceUserId);

        return NextResponse.json({
            success: true,
            message: `Dados migrados de ${legacyName} para o novo usuário.`
        });

    } catch (error: any) {
        console.error("Link Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
