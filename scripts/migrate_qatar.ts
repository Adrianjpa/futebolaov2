import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { qatar2022RawBets } from "../src/data/legacy/raw_qatar_bets";
import { qatar2022Matches } from "../src/data/legacy/qatar2022_matches";
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log("🚀 Iniciando migração Qatar 2022...");
    
    const champId = "c2022000-0000-0000-0000-000000000000";

    // 1. Create Championship
    const { error: champError } = await supabaseAdmin.from("championships").upsert({
        id: champId,
        name: "Copa do Mundo Qatar 2022",
        status: "finalizado",
        category: "world_cup",
        settings: {
            banner: {
                title: "Copa do Mundo 2022",
                subTitle: "Qatar",
                winnerName: "Marcelo",
                themeColor: "from-amber-600 to-red-900"
            }
        },
        legacy_import: true,
        created_at: "2022-11-01T00:00:00Z"
    });

    if (champError) {
        console.error("❌ Erro ao criar campeonato:", champError);
        return;
    }
    console.log("✅ Campeonato Qatar 2022 criado!");

    // 2. Ensure Legacy Users exist and map them
    const userMap: Record<string, string> = {};
    for (const bet of qatar2022RawBets) {
        // Find existing profile
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", bet.email);
            
        let userId = "";
        
        if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
        } else {
            // We shouldn't create Auth users from here since it requires GoTrue admin APIs.
            // But if they are legacy, maybe we just use their emails and assume they were created?
            // Actually, in Euro 2021 we just used the profiles that already existed!
            // Wait, for users that do NOT exist, the script might fail. We should use `legacy_stats` table for Hall of Fame!
            // The `import-legacy/route.ts` used `legacy_stats` table!
            console.log(`⚠️ Usuário ${bet.email} não encontrado na tabela profiles. O ranking usará legacy_stats.`);
            userId = "legacy_" + bet.user.toLowerCase();
        }
        
        userMap[bet.user] = userId;
    }

    // 3. Insert Matches
    const getApproximateDate = (index: number) => {
        const base = new Date("2022-11-20T12:00:00Z");
        base.setMinutes(base.getMinutes() + index * 120);
        return base.toISOString();
    };

    const generateMatchUUID = (index: number) => {
        const pad = index.toString().padStart(4, '0');
        return `cc202200-0000-0000-4444-a0000000${pad}`;
    };

    const matchesToInsert = qatar2022Matches.map((match, i) => ({
        id: generateMatchUUID(i),
        championship_id: champId,
        round: i < 48 ? 1 : i < 56 ? 2 : i < 60 ? 3 : i < 62 ? 4 : i === 62 ? 5 : 6,
        date: getApproximateDate(i),
        status: "finished",
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        score_home: match.homeScore,
        score_away: match.awayScore
    }));

    const { error: matchesError } = await supabaseAdmin.from("matches").upsert(matchesToInsert);
    if (matchesError) {
        console.error("❌ Erro ao inserir jogos:", matchesError);
        return;
    }
    console.log("✅ 64 Jogos inseridos!");

    // 4. Calculate Stats and Insert into legacy_stats
    await supabaseAdmin.from("legacy_stats").delete().eq("championship_id", champId);

    const statsToInsert: any[] = [];
    
    qatar2022RawBets.forEach(user => {
        let exacts = 0;
        let outcomes = 0;
        let errors = 0;
        let total = 0;

        user.bets.forEach((bet, i) => {
            const match = qatar2022Matches[i];
            let points = 0;
            if (match.homeScore === bet.home && match.awayScore === bet.away) points = 3;
            else if (Math.sign(match.homeScore - match.awayScore) === Math.sign(bet.home - bet.away)) points = 1;

            total += points;
            if (points === 3) exacts++;
            else if (points === 1) outcomes++;
            else errors++;
        });

        statsToInsert.push({
            id: crypto.randomUUID(),
            championship_id: champId,
            year: 2022,
            championship_name: "Copa do Mundo Qatar 2022",
            legacy_user_name: user.user,
            points: total,
            exact_scores: exacts,
            outcomes: outcomes,
            errors: errors,
            champion_pick: user.selections[0] // Slot 1 is the primary pick
        });
    });

    const { error: statsError } = await supabaseAdmin.from("legacy_stats").insert(statsToInsert);
    if (statsError) {
        console.error("❌ Erro ao inserir legacy_stats:", statsError);
    } else {
        console.log("✅ 12 Estatísticas Legacy inseridas para o Hall of Fame!");
    }
    
    console.log("🏁 Migração Finalizada com Sucesso!");
}

runMigration();
