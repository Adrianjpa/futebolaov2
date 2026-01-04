
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listChamps() {
    console.log("🏆 Listando Campeonatos Recentes...");

    // Select all champs, order by created_at desc
    const { data: champs, error } = await supabase
        .from("championships")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Erro ao listar:", error);
        return;
    }

    champs.forEach(c => {
        console.log(`🆔 ID: ${c.id}`);
        console.log(`📌 Nome: ${c.name}`);
        console.log(`⚙️  API Code: ${(c.settings as any)?.apiCode || 'N/A'}`);
        console.log(`📅 Criado em: ${c.created_at}`);
        console.log("------------------------------------------------");
    });
}

listChamps();
