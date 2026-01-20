import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyEuro2012Winners() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const champId = '2ecad449-e20f-4084-8ae6-c017083db04a';

    // 1. Get Ranking
    const { data: ranking } = await supabase
        .from('ranking_by_championship')
        .select('nickname, total_points')
        .eq('championship_id', champId)
        .order('total_points', { ascending: false });

    const maxPoints = ranking?.[0]?.total_points;
    const champions = ranking?.filter(u => u.total_points === maxPoints).map(u => u.nickname);

    // 2. Get Selections
    const { data: participants } = await supabase
        .from('championship_participants')
        .select('user_id, team_selections, profiles(nickname)')
        .eq('championship_id', champId);

    const officialRanking = ["Espanha", "Itália", "Portugal", "Alemanha", "Inglaterra"];

    const bestHits = participants?.map((p: any) => {
        const selections = (p.team_selections as string[]) || [];
        const hitRanks = selections.map((t: string) => {
            const cleanT = t.trim();
            const r = officialRanking.findIndex(rankName => rankName.trim() === cleanT);
            return r === -1 ? 999 : r;
        });

        const minRank = Math.min(...hitRanks);
        const optIdx = hitRanks.indexOf(minRank);

        return {
            nickname: p.profiles?.nickname,
            minRank,
            optIdx
        };
    }) || [];

    const validHits = bestHits.filter(h => h.minRank !== 999 && h.minRank !== Infinity);
    let goldWinners: string[] = [];
    if (validHits.length > 0) {
        const globalMinRank = Math.min(...validHits.map(h => h.minRank));
        const candidates = validHits.filter(h => h.minRank === globalMinRank);
        const bestOpt = Math.min(...candidates.map(c => c.optIdx));
        goldWinners = candidates.filter(c => c.optIdx === bestOpt).map(c => c.nickname);
    }

    console.log("🏆 Sugestão para Euro 2012:");
    console.log("🥇 Campeão Geral:", champions);
    console.log("🌟 Palpiteiro de Ouro:", goldWinners);
}

verifyEuro2012Winners();
