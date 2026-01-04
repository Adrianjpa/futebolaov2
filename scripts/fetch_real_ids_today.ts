
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function verifyRealIDs() {
    const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
    console.log("🕵️ Investigando os IDs reais da API para HOJE (2026-01-04)...");

    // Fetch matches for TODAY specifically
    const url = `https://api.football-data.org/v4/matches?dateFrom=2026-01-04&dateTo=2026-01-04`;

    try {
        const res = await fetch(url, { headers: { "X-Auth-Token": API_KEY! } });
        const data = await res.json();

        console.log(`\n📡 A API retornou ${data.matches?.length || 0} jogos para hoje.`);

        if (data.matches) {
            console.log("----------------------------------------------------------------");
            console.log("ID (API) | STATUS   | JOGO (Home x Away)");
            console.log("----------------------------------------------------------------");
            data.matches.forEach((m: any) => {
                const home = m.homeTeam.shortName || m.homeTeam.name;
                const away = m.awayTeam.shortName || m.awayTeam.name;
                console.log(`${m.id.toString().padEnd(9)}| ${m.status.padEnd(9)}| ${home} x ${away}`);
            });
            console.log("----------------------------------------------------------------");
        }

    } catch (e: any) {
        console.error("Erro no fetch:", e.message);
    }
}

verifyRealIDs();
