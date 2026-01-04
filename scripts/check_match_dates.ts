
const API_KEY = "4d0de3bcc1d64cf2bc0f464545b4eaef";
const URL = "https://api.football-data.org/v4/competitions/PL/matches?matchday=18";

async function checkDates() {
    console.log("🕵️ Investigando a Rodada 18 da Premier League na API...");

    const res = await fetch(URL, {
        headers: { "X-Auth-Token": API_KEY }
    });

    if (!res.ok) {
        console.error("❌ Erro API:", res.status);
        return;
    }

    const data = await res.json();
    const matches = data.matches || [];

    console.log(`\n📅 Temporada da API: ${data.filters?.season || 'Desconhecida'}`);
    console.log(`🔢 Total de jogos nessa rodada: ${matches.length}\n`);

    matches.slice(0, 3).forEach(m => {
        console.log(`🏟️  Jogo: ${m.homeTeam.shortName} vs ${m.awayTeam.shortName}`);
        console.log(`⏰ Data UTC (Vinda da API): ${m.utcDate}`);
        console.log(`🚦 Status na API: ${m.status}`);
        console.log("------------------------------------------------");
    });
}

checkDates();
