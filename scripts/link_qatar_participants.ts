import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { qatar2022RawBets } from "../src/data/legacy/raw_qatar_bets";
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function linkParticipants() {
    console.log("🚀 Vinculando participantes do Qatar 2022...");
    
    const champId = "c2022000-0000-0000-0000-000000000000";

    // Fetch the championship
    const { data: champ, error: champError } = await supabaseAdmin
        .from("championships")
        .select("*")
        .eq("id", champId)
        .single();

    if (champError || !champ) {
        console.error("❌ Erro ao buscar campeonato:", champError);
        return;
    }

    const participants = [];
    
    for (const bet of qatar2022RawBets) {
        let userId = `legacy_stats_qatar_${bet.user.replace(/\s+/g, '_')}`; // Using legacy_stats ID as fallback or maybe find real user ID.

        // Let's try to find if the user has a real profile.
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", bet.email);
            
        if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            
            // Also add to championship_participants table if it exists
            const { error: insertError } = await supabaseAdmin
                .from("championship_participants")
                .upsert({
                    id: crypto.randomUUID(),
                    user_id: userId,
                    championship_id: champId,
                    team_selections: bet.selections
                }, { onConflict: 'user_id,championship_id' });
                
            if (insertError) {
               console.log("⚠️ Erro (ou tabela não existe) em championship_participants para:", bet.user, insertError.message);
            }
        }

        participants.push({
            userId: userId, // Some parts of the app use userId
            user_id: userId, // Some use user_id
            name: bet.user,
            selections: bet.selections,
            isLegacy: true,
            email: bet.email
        });
    }

    const newSettings = {
        ...(champ.settings || {}),
        participants: participants
    };

    const { error: updateError } = await supabaseAdmin
        .from("championships")
        .update({ settings: newSettings })
        .eq("id", champId);

    if (updateError) {
        console.error("❌ Erro ao atualizar settings do campeonato:", updateError);
    } else {
        console.log(`✅ ${participants.length} participantes vinculados com sucesso nas configurações do campeonato!`);
    }
}

linkParticipants();
