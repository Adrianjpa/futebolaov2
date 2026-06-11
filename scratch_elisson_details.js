const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const matchId = 'c5cb6c02-79e8-471f-aad8-ca1037e84ede';
  const { data: match } = await supabase.from('matches').select('home_team, away_team, date').eq('id', matchId).single();
  
  const { data: pred } = await supabase.from('predictions').select('home_score, away_score').eq('id', 'bb77ed54-bb4c-44bb-84fd-35940ba9472c').single();
  
  console.log(`Jogo: ${match.home_team} vs ${match.away_team} (${match.date})`);
  console.log(`Placar: ${match.home_team} ${pred.home_score} x ${pred.away_score} ${match.away_team}`);
}
check();
