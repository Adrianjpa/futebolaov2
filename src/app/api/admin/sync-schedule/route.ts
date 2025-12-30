import { NextResponse } from "next/server";
import { supabaseAdmin, createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
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
        const { championshipId } = await request.json();

        if (!championshipId) {
            return NextResponse.json({ error: "Championship ID required" }, { status: 400 });
        }

        console.log(`Starting manual schedule sync for championship: ${championshipId}`);

        // 1. Fetch Championship to get API Code (from settings)
        const { data: champ, error: champError } = await (supabaseAdmin
            .from("championships")
            .select("settings")
            .eq("id", championshipId)
            .single() as any);

        if (champError || !champ) {
            return NextResponse.json({ error: "Championship not found" }, { status: 404 });
        }

        const apiCode = (champ.settings as any)?.apiCode;

        if (!apiCode) {
            return NextResponse.json({ error: "Championship has no API Code" }, { status: 400 });
        }

        // 2. Fetch Matches from API
        const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
        const response = await fetch(`https://api.football-data.org/v4/matches?code=${apiCode}`, {
            headers: { "X-Auth-Token": API_KEY || "" },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`External API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const apiMatches = data.matches || [];
        const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id?.toString(), m]));

        console.log(`Fetched ${apiMatches.length} matches from API for code ${apiCode}`);

        // 3. Fetch Local Matches
        const { data: localMatches, error: matchesError } = await (supabaseAdmin
            .from("matches")
            .select("*")
            .eq("championship_id", championshipId) as any);

        if (matchesError) throw matchesError;

        let updatesCount = 0;

        for (const localMatch of (localMatches || []) as any[]) {
            const apiId = localMatch.external_id;

            if (apiId) {
                const apiMatch = apiMatchesMap.get(apiId) as any;

                if (apiMatch) {
                    const apiDate = new Date(apiMatch.utcDate);
                    const localDate = new Date(localMatch.date);
                    const timeDiff = Math.abs(apiDate.getTime() - localDate.getTime());
                    const isDateChanged = timeDiff > 1000 * 60 * 5;

                    let newStatus = 'scheduled';
                    if (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') newStatus = 'live';
                    if (apiMatch.status === 'FINISHED') newStatus = 'finished';

                    if (isDateChanged || localMatch.status !== newStatus) {
                        const { error: updateError } = await (supabaseAdmin
                            .from("matches") as any)
                            .update({
                                date: apiDate.toISOString(),
                                status: newStatus,
                                home_team_crest: apiMatch.homeTeam?.crest,
                                away_team_crest: apiMatch.awayTeam?.crest
                            })
                            .eq("id", localMatch.id);

                        if (!updateError) updatesCount++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `${updatesCount} partidas sincronizadas com sucesso.`,
            updates: updatesCount
        });

    } catch (error: any) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
