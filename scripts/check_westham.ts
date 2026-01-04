
const API_KEY = "4d0de3bcc1d64cf2bc0f464545b4eaef";

// Buscar jogos do West Ham na temporada
const URL = "https://api.football-data.org/v4/teams/563/matches?status=SCHEDULED&limit=5";
// 563 é West Ham

async function checkWestHam() {
    console.log("🕵️ Investigando West Ham...");

    // Buscar TODOS os jogos recentes, nao so scheduled
    const res = await fetch("https://api.football-data.org/v4/competitions/PL/matches?matchday=18", {
        headers: { "X-Auth-Token": API_KEY }
    });

    const data = await res.json();
    const westHamGame = data.matches.find((m: any) =>
        m.homeTeam.name.includes("West Ham") || m.awayTeam.name.includes("West Ham")
    );

    if (westHamGame) {
        console.log("\n🐹 Jogo do West Ham encontrado na Rodada 18:");
        console.log(`🆚 ${westHamGame.homeTeam.name} vs ${westHamGame.awayTeam.name}`);
        console.log(`⏰ Data: ${westHamGame.utcDate}`);
        console.log(`🚦 Status: ${westHamGame.status}`);
        console.log(`⚽ Placar: ${JSON.stringify(westHamGame.score.fullTime)}`);
    } else {
        console.log("❌ Jogo não encontrado na rodada 18.");
    }
}

checkWestHam();
