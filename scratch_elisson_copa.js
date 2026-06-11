const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const champId = '87b22aab-521b-4302-815a-500bec4b4a0a';
  const userId = 'c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b';
  
  // Get all matches for Copa do Mundo
  const { data: matches } = await supabase.from('matches').select('id, home_team, away_team, date').eq('championship_id', champId);
  if (!matches) return console.log('No matches');
  
  const matchIds = matches.map(m => m.id);
  
  // Get Elisson's predictions for these matches
  const { data: preds } = await supabase.from('predictions').select('*').in('match_id', matchIds).eq('user_id', userId);
  
  if (!preds || preds.length === 0) {
    console.log('Elisson não tem nenhum palpite cadastrado na Copa do Mundo 2026.');
  } else {
    for (const p of preds) {
      const m = matches.find(x => x.id === p.match_id);
      console.log(`Jogo: ${m.home_team} vs ${m.away_team} -> Placar: ${p.home_score} x ${p.away_score}`);
    }
  }
}
check();
