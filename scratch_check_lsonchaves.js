const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('predictions').select('*').eq('id', 'bb77ed54-bb4c-44bb-84fd-35940ba9472c');
  console.log('Prediction exists:', data.length > 0);
}
check();
