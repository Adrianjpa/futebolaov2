import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { qatar2022RawBets } from "../src/data/legacy/raw_qatar_bets";
import { qatar2022Matches } from "../src/data/legacy/qatar2022_matches";
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function insertPredictions() {
    console.log("🚀 Inserindo 768 palpites do Qatar 2022 na tabela predictions...");
    
    const champId = "c2022000-0000-0000-0000-000000000000";

    const generateMatchUUID = (index: number) => {
        const pad = index.toString().padStart(4, '0');
        return `cc202200-0000-0000-4444-a0000000${pad}`;
    };

    const predictionsToInsert: any[] = [];

    for (const userBets of qatar2022RawBets) {
        // Fetch the user's real UUID from profiles
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", userBets.email);

        if (!profiles || profiles.length === 0) {
            console.error(`❌ Usuário ${userBets.email} não encontrado na tabela profiles. Pulando...`);
            continue;
        }

        const userId = profiles[0].id;

        userBets.bets.forEach((bet, i) => {
            const match = qatar2022Matches[i];
            const matchId = generateMatchUUID(i);
            
            let points = 0;
            if (match.homeScore === bet.home && match.awayScore === bet.away) {
                points = 3;
            } else if (Math.sign(match.homeScore - match.awayScore) === Math.sign(bet.home - bet.away)) {
                points = 1;
            }

            predictionsToInsert.push({
                id: crypto.randomUUID(),
                user_id: userId,
                match_id: matchId,
                home_score: bet.home,
                away_score: bet.away,
                points: points,
                created_at: "2022-11-01T00:00:00Z"
            });
        });
    }

    // Delete existing predictions for these matches to avoid duplicates
    const matchIds = Array.from({length: 64}, (_, i) => generateMatchUUID(i));
    
    console.log("Limpando palpites antigos desses jogos (se houver)...");
    const { error: deleteError } = await supabaseAdmin
        .from("predictions")
        .delete()
        .in("match_id", matchIds);
        
    if (deleteError) {
        console.error("⚠️ Erro ao limpar palpites antigos:", deleteError.message);
    }

    console.log(`Inserindo ${predictionsToInsert.length} palpites...`);
    
    // Insert in chunks to avoid payload too large (though 768 is small, it's good practice)
    const chunkSize = 200;
    for (let i = 0; i < predictionsToInsert.length; i += chunkSize) {
        const chunk = predictionsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabaseAdmin
            .from("predictions")
            .insert(chunk);
            
        if (insertError) {
            console.error(`❌ Erro no chunk ${i}:`, insertError.message);
            return;
        }
    }

    console.log("✅ Todos os palpites foram inseridos com sucesso nas tabelas oficiais do sistema!");
}

insertPredictions();
