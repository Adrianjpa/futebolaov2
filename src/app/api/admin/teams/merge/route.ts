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
        const { primaryTeamId, duplicateTeamIds } = await request.json();

        if (!primaryTeamId || !duplicateTeamIds || duplicateTeamIds.length === 0) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // Get primary team name
        const { data: primaryTeam, error: ptError } = await supabaseAdmin.from('teams').select('name').eq('id', primaryTeamId).single();
        if (ptError || !primaryTeam) throw new Error("Primary team not found");
        
        const primaryName = primaryTeam.name;

        // Get duplicate teams names
        const { data: duplicateTeams, error: dtError } = await supabaseAdmin.from('teams').select('id, name').in('id', duplicateTeamIds);
        if (dtError || !duplicateTeams) throw new Error("Duplicate teams not found");

        const duplicateNames = duplicateTeams.map(t => t.name);

        // 3. Update Matches (home_team)
        const { error: homeError } = await supabaseAdmin
            .from('matches')
            .update({ home_team: primaryName })
            .in('home_team', duplicateNames);
            
        if (homeError) console.error("Error updating home_team", homeError);

        // 4. Update Matches (away_team)
        const { error: awayError } = await supabaseAdmin
            .from('matches')
            .update({ away_team: primaryName })
            .in('away_team', duplicateNames);
            
        if (awayError) console.error("Error updating away_team", awayError);

        // 5. Update championship_participants (team_selections)
        // Since it's a JSON array, it's easier to fetch all, replace and update.
        const { data: participants } = await supabaseAdmin.from('championship_participants').select('*');
        if (participants) {
            for (const p of participants) {
                if (p.team_selections && Array.isArray(p.team_selections)) {
                    let changed = false;
                    const newSelections = p.team_selections.map((sel: string) => {
                        if (duplicateNames.includes(sel)) {
                            changed = true;
                            return primaryName;
                        }
                        return sel;
                    });
                    
                    if (changed) {
                        await supabaseAdmin.from('championship_participants')
                            .update({ team_selections: newSelections })
                            .eq('id', p.id);
                    }
                }
            }
        }

        // 6. Delete duplicate teams from dictionary
        const { error: deleteError } = await supabaseAdmin.from('teams').delete().in('id', duplicateTeamIds);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, message: "Teams merged successfully" });

    } catch (error: any) {
        console.error("Admin Merge Teams API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
