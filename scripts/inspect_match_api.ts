
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function inspectMatch() {
    const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
    console.log("🕵️ Inspecionando jogo 537980 (Leeds)...");

    const url = `https://api.football-data.org/v4/matches/537980`;

    try {
        const res = await fetch(url, { headers: { "X-Auth-Token": API_KEY! } });
        const data = await res.json();

        console.log("--- DADOS DA API ---");
        console.log(`Jogo: ${data.homeTeam?.name} x ${data.awayTeam?.name}`);
        console.log(`Status: ${data.status}`);
        console.log(`Data UTC: ${data.utcDate}`); // PONTO CRÍTICO
        console.log(`Score: ${data.score?.fullTime?.home}x${data.score?.fullTime?.away}`);

    } catch (e: any) {
        console.error("Erro no fetch:", e.message);
    }
}

inspectMatch();
