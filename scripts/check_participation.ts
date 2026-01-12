
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserParticipation(email: string) {
    // 1. Get User ID
    const { data: user } = await supabase.from("profiles").select("id, email").eq("email", email).single();
    if (!user) {
        console.log("User not found");
        return;
    }
    const userId = user.id;
    console.log(`Checking participation for User ID: ${userId} (${email})`);

    // 2. Check championship_participants table
    const { data: joinTable } = await supabase.from("championship_participants").select("championship_id").eq("user_id", userId);
    console.log("Participation in JOIN TABLE:", joinTable?.map(p => p.championship_id));

    // 3. Check settings JSON in championships table
    const { data: allChamps } = await supabase.from("championships").select("id, name, status, settings");

    const jsonParticipation: any[] = [];
    allChamps?.forEach(c => {
        const settings = c.settings as any;
        const participants = settings?.participants || [];
        const isParticipant = participants.some((p: any) => p.userId === userId || p.user_id === userId);
        if (isParticipant) {
            jsonParticipation.push({ id: c.id, name: c.name, status: c.status });
        }
    });

    console.log("Participation in SETTINGS JSON:", jsonParticipation);
}

const targetEmail = "adriano@legacy.local";
checkUserParticipation(targetEmail);
