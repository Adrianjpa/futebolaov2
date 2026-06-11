const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const matchId = 'c5cb6c02-79e8-471f-aad8-ca1037e84ede';
  const { data: match } = await supabase.from('matches').select('championship_id').eq('id', matchId).single();
  console.log('Championship of match:', match.championship_id);
}
check();
