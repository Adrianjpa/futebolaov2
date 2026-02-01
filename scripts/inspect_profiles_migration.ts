import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectProfiles() {
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*");

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Total profiles: ${profiles.length}`);
    const localUsers = profiles.filter(p => p.email?.endsWith(".local"));
    console.log(`Profiles with .local email: ${localUsers.length}`);
    localUsers.forEach(u => console.log(`- ${u.nome || u.nickname} (${u.email})`));

    const realUsers = profiles.filter(p => !p.email?.endsWith(".local"));
    console.log(`\nReal profiles: ${realUsers.length}`);
    realUsers.forEach(u => console.log(`- ${u.nome || u.nickname} (${u.email})`));
}

inspectProfiles();
