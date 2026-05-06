import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function createMissingLegacyUsers() {
    console.log("🚀 Criando usuários Rodrigo e Tony...");

    const usersToCreate = [
        { email: "rodrigo@legacy.local", nome: "Rodrigo", nickname: "rodrigo" },
        { email: "tony@copa2022.local", nome: "Tony", nickname: "tony" }
    ];

    for (const user of usersToCreate) {
        // Check if exists
        const { data: existing } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", user.email);

        if (existing && existing.length > 0) {
            console.log(`✅ ${user.nome} já existe na tabela profiles.`);
        } else {
            console.log(`⚠️ Criando auth user para ${user.nome}...`);
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                password: "password123", // Default placeholder
                email_confirm: true,
                user_metadata: {
                    nome: user.nome,
                    nickname: user.nickname
                }
            });

            if (error) {
                console.error(`❌ Erro ao criar ${user.nome}:`, error.message);
            } else {
                console.log(`✅ ${user.nome} criado com UUID: ${data.user.id}`);
            }
        }
    }
    
    console.log("🏁 Execução finalizada.");
}

createMissingLegacyUsers();
