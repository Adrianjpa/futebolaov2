
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function syncParticipantsTable() {
    console.log("🛠️ Sincronizando tabela 'championship_participants' com 'settings.participants'...");

    const { data: champs } = await supabase.from('championships').select('id, name, settings');
    if (!champs) return;

    for (const champ of champs) {
        const settings = champ.settings as any;
        const participants = settings?.participants || [];

        if (participants.length === 0) {
            console.log(`   - ${champ.name}: Nenhum participante no settings.`);
            continue;
        }

        console.log(`🧐 Processando ${champ.name} (${participants.length} participantes)...`);

        const rows = participants.map((p: any) => ({
            championship_id: champ.id,
            user_id: p.userId,
            team_selections: p.teamSelections || [],
            updated_at: new Date().toISOString()
        }));

        // Upsert by championship_id and user_id (needs unique constraint)
        // Since I don't know the unique constraint, I'll delete and re-insert for safety or use a loop
        // Let's try upsert assuming (championship_id, user_id) is unique
        const { error } = await supabase
            .from('championship_participants')
            .upsert(rows, { onConflict: 'championship_id,user_id' });

        if (error) {
            console.error(`   ❌ Erro no upsert:`, error.message);
            // fallback: delete and insert
            await supabase.from('championship_participants').delete().eq('championship_id', champ.id);
            await supabase.from('championship_participants').insert(rows.map(r => ({ ...r, id: undefined })));
            console.log(`   ✅ Sincronizado via Delete/Insert.`);
        } else {
            console.log(`   ✅ Sincronizado via Upsert.`);
        }
    }
}

syncParticipantsTable();
