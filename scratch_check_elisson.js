const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const champId = '87b22aab-521b-4302-815a-500bec4b4a0a';
  const { data: champ } = await supabase.from('championships').select('settings').eq('id', champId).single();
  const participants = champ.settings?.participants || [];
  console.log('Participantes do campeonato:', participants.length);
  
  const elisson = participants.find(p => p.email === 'lsonchaves@gmail.com' || (p.displayName && p.displayName.includes('Elisson')));
  console.log('Elisson in settings?', elisson);
  
  const { data: cp } = await supabase.from('championship_participants').select('*').eq('championship_id', champId);
  console.log('championship_participants tem:', cp?.length, 'registros');
  
  const cpElisson = cp?.find(p => p.user_id === 'c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b');
  console.log('Elisson in championship_participants?', cpElisson);
}
check();
