const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', 'lindoaldo@legacy.local');
  console.log("Profiles matching lindoaldo@legacy.local:", data, error);
  
  if (data && data.length > 0) {
    const id = data[0].id;
    const { error: updateError } = await supabase.from('profiles').update({ foto_perfil: '/lindoaldo.jpg', nickname: 'Lóia', nome: 'Lóia' }).eq('id', id);
    console.log("Update profile:", updateError || "Success");
  } else {
    // try to find by nickname
    const { data: data2 } = await supabase.from('profiles').select('*').eq('nickname', 'Lóia');
    console.log("Profiles matching nickname Lóia:", data2);
    if (data2 && data2.length > 0) {
        const id = data2[0].id;
        const { error: updateError } = await supabase.from('profiles').update({ foto_perfil: '/lindoaldo.jpg' }).eq('id', id);
        console.log("Update profile:", updateError || "Success");
    }
  }
}
run();
