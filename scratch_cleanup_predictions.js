const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanUp() {
  const { data: champs } = await supabase.from('championships').select('id, settings');
  let totalDeleted = 0;
  for (const champ of champs) {
     const participants = champ.settings?.participants || [];
     const participantIds = participants.map(p => p.userId || p.user_id).filter(id => id);
     
     const { data: matches } = await supabase.from('matches').select('id').eq('championship_id', champ.id);
     const matchIds = matches.map(m => m.id);
     
     if (matchIds.length > 0) {
        const { data: preds } = await supabase.from('predictions').select('id, user_id').in('match_id', matchIds);
        
        if (preds) {
            const predsToDelete = preds.filter(p => !participantIds.includes(p.user_id));
            
            if (predsToDelete.length > 0) {
                console.log(`Championship ${champ.id}: Found ${predsToDelete.length} orphan predictions. Deleting...`);
                // Batch delete
                const idsToDelete = predsToDelete.map(p => p.id);
                // Supabase IN max is typically 1000, we'll slice if needed, but likely small
                for (let i = 0; i < idsToDelete.length; i += 100) {
                    const chunk = idsToDelete.slice(i, i + 100);
                    const { error } = await supabase.from('predictions').delete().in('id', chunk);
                    if (error) {
                        console.error('Error deleting:', error);
                    } else {
                        totalDeleted += chunk.length;
                    }
                }
            }
        }
     }
  }
  console.log(`Total orphan predictions deleted: ${totalDeleted}`);
}
cleanUp();
