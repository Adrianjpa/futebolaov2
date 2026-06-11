const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const champId = '87b22aab-521b-4302-815a-500bec4b4a0a';
  const { data: champ } = await supabase.from('championships').select('name').eq('id', champId).single();
  console.log('Campeonato:', champ?.name);

  // Since I already deleted the prediction, I can't query the prediction table.
  // Wait, I might be able to check logs or I know there was exactly 1 prediction.
  // The user ID was in the output of the first check I ran!
  // Output of check:
  /*
    id: 'bb77ed54-bb4c-44bb-84fd-35940ba9472c',
    user_id: 'c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b',
    match_id: 'c5cb6c02-79e8-471f-aad8-ca1037e84ede',
  */
  // Let me query this user ID
  const userId = 'c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b';
  const { data: user } = await supabase.from('profiles').select('nome, nickname, email').eq('id', userId).single();
  console.log('Usuario:', user);
}
check();
