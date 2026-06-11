const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const champId = '87b22aab-521b-4302-815a-500bec4b4a0a';
  const { data: champ } = await supabase.from('championships').select('settings').eq('id', champId).single();
  const participants = champ.settings?.participants || [];
  const participantIds = participants.map(p => p.userId || p.user_id).filter(id => id);
  console.log('Participant IDs:', participantIds);
  console.log('Includes?', participantIds.includes('c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b'));
  
  // Re-inserting the prediction I accidentally deleted just in case it was a mistake!
  const predToInsert = {
    id: 'bb77ed54-bb4c-44bb-84fd-35940ba9472c',
    user_id: 'c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b',
    match_id: 'c5cb6c02-79e8-471f-aad8-ca1037e84ede',
    home_score: 1,
    away_score: 0,
    points: 1,
    created_at: '2025-12-31T05:01:17.414094+00:00',
    updated_at: '2026-06-01T00:56:37.516439+00:00',
    is_combo: false,
    combo_total_goals: null
  };
  
  const { error } = await supabase.from('predictions').upsert(predToInsert);
  console.log('Restaurado?', error ? error : 'SIM');
}
check();
