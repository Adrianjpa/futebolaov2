require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: ghosts, error: selErr } = await supabase.from('profiles').select('*').eq('funcao', 'teste');
    if (ghosts && ghosts.length > 0) {
        console.log(`Found ${ghosts.length} ghosts. Resetting to 'usuario'...`);
        for (const ghost of ghosts) {
            const { error: updErr } = await supabase.from('profiles').update({ funcao: 'usuario' }).eq('id', ghost.id);
            if (updErr) console.error("Error updating:", updErr);
            else console.log(`Reset ${ghost.nickname || ghost.nome} to 'usuario'`);
        }
    } else {
        console.log("No ghosts found to reset.");
    }
}
check();
